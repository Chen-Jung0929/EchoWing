# Problems Not Fixed

## Unrelated Repository LFS Mismatch

`backend/models/resnet18_v3_int8.onnx` is stored as a regular Git blob while
`backend/.gitattributes` marks it as Git LFS. A fresh `git lfs pull` or checkout
therefore reports that the file should have been an LFS pointer and can leave
the worktree looking modified. This is unrelated to Perch and was not fixed.

## NCHC Authentication Model

Taiwania 3 currently advertises only keyboard-interactive authentication for
this account. Direct public-key SSH is not accepted. The existing
`C:\AI_CoScientist_Team_Toolkit\standalone_tools\nchc_connector` bridge was used
successfully because it performs password, Email OTP selection, and Gmail OTP
retrieval while keeping secrets out of logs.

## Test Audio

The repository contains no biological test audio. The generated 30-second WAV
is suitable for pipeline timing and tensor sanity only, not biological accuracy
claims. A small real-bird validation set remains necessary before making TFLite
the default production runtime.

## TFLite Deprecation Warning

TensorFlow 2.20 warns that `tf.lite.Interpreter` will eventually be replaced by
LiteRT. The current interpreter works and is appropriate for this bounded
candidate integration; migration was not mixed into this optimization task.
