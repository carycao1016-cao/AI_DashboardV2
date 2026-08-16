import json
import unittest

from parser_poc.ark_adapter import ArkConnectionConfig, ArkResponseError, ArkStructuredAdapter
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

    def test_retries_once_after_invalid_json_then_accepts(self):
        adapter, requests = self._adapter([
            {"choices": [{"message": {"content": "not json"}}]},
            {"choices": [{"message": {"content": '{"sheet_name":"Sheet1","chunk_id":"c1","candidates":[]}'}}]},
        ])
        result = adapter.generate_structured(task_name="sheet_outline", payload={}, output_model=SheetOutlineResponse)
        self.assertEqual(result.chunk_id, "c1")
        self.assertEqual(len(requests), 2)
        self.assertEqual([record["outcome"] for record in adapter.call_records], ["invalid_output", "accepted"])

    def test_fails_after_one_invalid_output_repair(self):
        adapter, _requests = self._adapter([
            {"choices": [{"message": {"content": "not json"}}]},
            {"choices": [{"message": {"content": "still not json"}}]},
        ])
        with self.assertRaises(ArkResponseError):
            adapter.generate_structured(task_name="sheet_outline", payload={}, output_model=SheetOutlineResponse)


if __name__ == "__main__":
    unittest.main()
