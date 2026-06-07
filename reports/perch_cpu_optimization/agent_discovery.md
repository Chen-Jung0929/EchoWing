# Local AI Co-Scientist Agent Discovery

Toolkit inspected: `C:\AI_CoScientist_Team_Toolkit`

## Relevant Existing Agents

- `bioinformatics_workflow_strategist`: closest available workflow/NCHC/reproducibility advisor.
- `ml_validation_scientist`: closest available validation-gate advisor for output compatibility.
- `reproducibility_checker`: environment/version-control review; it ran but its JSON console output failed under Windows CP950.
- `workspace_guard`: confirmed the requested feature branch and no active agent lock.
- `data_availability_auditor`, `provenance_recorder`, and `handoff_coordinator` are useful later for formal handoff, but are not model-conversion specialists.

## Limitations

The toolkit has no dedicated TensorFlow/XLA/ONNX quantization or CPU deployment agent. The two closest advisory agents are generic biomedical workflow/validation agents and scanned the local `.venv-perch`, so their raw inventory is noisy. Codex therefore remains the technical implementer and treats their advice as lightweight process guidance only.

## Execution Summary

- `bioinformatics_workflow_strategist`: recommended pinned environments, reproducible commands, explicit QC, and NCHC execution notes.
- `ml_validation_scientist`: generic output reinforced the need for an explicit validation gate; project-specific gates are shape/finite values/label mapping/top-k overlap/timing.
- `reproducibility_checker`: generated `feedback_box/reproducibility_check_20260607_142427.md`, then hit a CP950 `UnicodeEncodeError`. This is an agent-tooling issue, not an EchoWing runtime issue.
- `workspace_guard`: branch `feature/perch-cpu-onnx-int8-optimization`, no active lock.
