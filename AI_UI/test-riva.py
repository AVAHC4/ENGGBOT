import nvidia.riva.client as riva_client
import wave
import sys

def test_riva_asr(audio_file):
    # Initialize Riva client
    client = riva_client.RivaClient("localhost:50051")
    
    # Read audio file
    with wave.open(audio_file, 'rb') as wf:
        audio_data = wf.readframes(wf.getnframes())
    
    # Perform ASR
    response = client.asr(audio_data)
    
    # Print transcription
    print("Transcription:", response.text)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test-riva.py <audio_file.wav>")
        sys.exit(1)
    
    test_riva_asr(sys.argv[1]) 