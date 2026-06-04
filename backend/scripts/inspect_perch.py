import tensorflow as tf

def inspect_saved_model(path):
    print(f"Loading from {path}...")
    saved = tf.saved_model.load(path)
    sig = saved.signatures["serving_default"]
    print("Inputs:", sig.structured_input_signature)
    print("Outputs:", sig.structured_outputs)

if __name__ == "__main__":
    inspect_saved_model(r"c:\Kaggle - Perch\EchoWing_New\backend\models\perch_v2_cpu_savedmodel")
