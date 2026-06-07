# Perch Optimized Runtime Quick Output Sanity Check

## Result

- **tf**: shape `[6, 14795]`, finite=True, range=0.0001092..1, TF top-5 overlap=5; top-5: Musical_instrument, Music, Alarm, Wind_instrument_and_woodwind_instrument, Bell
- **tflite**: shape `[6, 14795]`, finite=True, range=0.0001092..1, TF top-5 overlap=5; top-5: Musical_instrument, Music, Alarm, Wind_instrument_and_woodwind_instrument, Bell
- **tflite_int8**: shape `[6, 14795]`, finite=True, range=0.0001092..1, TF top-5 overlap=5; top-5: Musical_instrument, Music, Wind_instrument_and_woodwind_instrument, Alarm, Bell

## Scope

This verifies shape, finite values, readable labels, score scale, and top-5 overlap only. Synthetic audio makes this unsuitable as biological accuracy validation.
