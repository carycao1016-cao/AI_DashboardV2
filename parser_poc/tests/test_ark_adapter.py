import json
import os
import socket
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from parser_poc.ark_adapter import ArkConnectionConfig, ArkRequestError, ArkResponseError, ArkStructuredAdapter, load_local_ark_environment
from parser_poc.contracts import SheetOutlineResponse


class ArkStructuredAdapterTests(unittest.TestCase):
    def _adapter(self, responses):
        requests = []

        def transport(request, timeout):
            requests.append(request)
            return json.dumps(responses.pop(0)).encode("utf-8")

        adapter = ArkStructuredAdapter(
            profile="deepseek",
            config=ArkConnectionConfig(api_key="test-secret", model="ep-test"),
            transport=transport,
        )
        return adapter, requests

    def test_validates_ark_json_against_requested_pydantic_model(self):
        adapter, requests = self._adapter([
            {"choices": [{"message": {"content": '{"sheet_name":"Sheet1","chunk_id":"c1","candidates":[]}'}}]}
        ])
        result = adapter.generate_structured(
            task_name="sheet_outline",
            payload={"sheet_name": "Sheet1", "rows": []},
            output_model=SheetOutlineResponse,
        )
        self.assertEqual(result.sheet_name, "Sheet1")
        self.assertEqual(len(requests), 1)
        self.assertEqual(adapter.call_records[-1]["outcome"], "accepted")
        self.assertNotIn("test-secret", repr(adapter.config))
        self.assertNotIn("ep-test", str(adapter.call_records))

    def test_retries_once_after_invalid_json_then_accepts(self):
        adapter, requests = self._adapter([
            {"choices": [{"message": {"content": "not json"}}]},
            {"choices": [{"message": {"content": '{"sheet_name":"Sheet1","chunk_id":"c1","candidates":[]}'}}]},
        ])
        result = adapter.generate_structured(task_name="sheet_outline", payload={}, output_model=SheetOutlineResponse)
        self.assertEqual(result.chunk_id, "c1")
        self.assertEqual(len(requests), 2)
        self.assertEqual([record["outcome"] for record in adapter.call_records], ["invalid_output", "accepted"])

    def test_detail_prompt_requires_full_physical_table_range(self):
        responses = [{"choices": [{"message": {"content": '{"sheet_name":"Sheet1","window_id":"w1","proposals":[]}'}}]}]
        requests = []

        def transport(request, _timeout):
            requests.append(json.loads(request.data.decode("utf-8")))
            return json.dumps(responses.pop(0)).encode("utf-8")

        adapter = ArkStructuredAdapter(
            profile="deepseek",
            config=ArkConnectionConfig(api_key="test-secret", model="ep-test"),
            transport=transport,
        )
        from parser_poc.contracts import DetailWindowResponse

        adapter.generate_structured(task_name="detail_window", payload={"detail_chunks": []}, output_model=DetailWindowResponse)
        message = requests[0]["messages"][0]["content"]
        self.assertIn("完整的物理表范围", message)
        self.assertEqual(
            requests[0]["messages"][1]["content"].find("full_physical_table_range_including_title_header_base_data_footnote") >= 0,
            True,
        )

    def test_fails_after_one_invalid_output_repair(self):
        adapter, _requests = self._adapter([
            {"choices": [{"message": {"content": "not json"}}]},
            {"choices": [{"message": {"content": "still not json"}}]},
        ])
        with self.assertRaises(ArkResponseError):
            adapter.generate_structured(task_name="sheet_outline", payload={}, output_model=SheetOutlineResponse)

    def test_local_environment_file_is_loaded_without_overriding_process_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env.ark"
            path.write_text(
                "ARK_API_KEY='local-key'\nARK_DEEPSEEK_MODEL='ep-local'\n",
                encoding="utf-8",
            )
            self.assertEqual(load_local_ark_environment(path)["ARK_DEEPSEEK_MODEL"], "ep-local")
            with patch.dict(os.environ, {"ARK_DEEPSEEK_MODEL": "ep-process"}, clear=False):
                config = ArkConnectionConfig.from_environment("deepseek", env_file=path)
        self.assertEqual(config.model, "ep-process")

    def test_socket_timeout_is_reported_as_request_error(self):
        def timeout_transport(_request, _timeout):
            raise socket.timeout("read operation timed out")

        adapter = ArkStructuredAdapter(
            profile="deepseek",
            config=ArkConnectionConfig(api_key="test-secret", model="ep-test"),
            transport=timeout_transport,
        )
        with self.assertRaises(ArkRequestError):
            adapter.generate_structured(task_name="sheet_outline", payload={}, output_model=SheetOutlineResponse)


if __name__ == "__main__":
    unittest.main()
