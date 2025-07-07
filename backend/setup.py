#!/usr/bin/env python3
"""
Setup and installation script for Speech-to-Text Sentiment Analysis API
"""

import os
import sys
import subprocess
import platform

def run_command(command):
    """Run a command and return success status"""
    try:
        subprocess.run(command, shell=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"Error: {e}")
        return False

def install_system_dependencies():
    """Install system dependencies based on OS"""
    system = platform.system().lower()
    
    print("Installing system dependencies...")
    
    if system == "linux":
        # Ubuntu/Debian
        commands = [
            "sudo apt update",
            "sudo apt install -y ffmpeg libsndfile1 portaudio19-dev python3-dev"
        ]
        for cmd in commands:
            if not run_command(cmd):
                print("Warning: Some system dependencies may not have been installed properly")
                
    elif system == "darwin":  # macOS
        commands = [
            "brew install ffmpeg libsndfile portaudio"
        ]
        for cmd in commands:
            if not run_command(cmd):
                print("Warning: Some system dependencies may not have been installed properly")
                print("Make sure you have Homebrew installed: https://brew.sh/")
                
    elif system == "windows":
        print("On Windows, please ensure you have:")
        print("1. Visual Studio Build Tools installed")
        print("2. FFmpeg available in PATH")
        print("You may need to install these manually.")
    
    print("System dependencies installation completed.")

def create_directories():
    """Create necessary directories"""
    directories = [
        "uploads",
        "logs",
        "models",
        "temp"
    ]
    
    print("Creating directories...")
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Created: {directory}/")

def setup_python_environment():
    """Set up Python virtual environment and install dependencies"""
    print("Setting up Python environment...")
    
    # Create virtual environment
    if not os.path.exists("venv"):
        print("Creating virtual environment...")
        if not run_command(f"{sys.executable} -m venv venv"):
            print("Failed to create virtual environment")
            return False
    
    # Determine pip command based on OS
    if platform.system().lower() == "windows":
        pip_cmd = ".\\venv\\Scripts\\pip"
        python_cmd = ".\\venv\\Scripts\\python"
    else:
        pip_cmd = "./venv/bin/pip"
        python_cmd = "./venv/bin/python"
    
    # Upgrade pip
    print("Upgrading pip...")
    run_command(f"{pip_cmd} install --upgrade pip")
    
    # Install PyTorch first (for better compatibility)
    print("Installing PyTorch...")
    torch_cmd = f"{pip_cmd} install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu"
    run_command(torch_cmd)
    
    # Install other requirements
    print("Installing requirements...")
    if not run_command(f"{pip_cmd} install -r requirements.txt"):
        print("Failed to install requirements")
        return False
    
    print("Python environment setup completed.")
    return True

def download_models():
    """Download required models"""
    print("Downloading AI models...")
    
    # Determine python command
    if platform.system().lower() == "windows":
        python_cmd = ".\\venv\\Scripts\\python"
    else:
        python_cmd = "./venv/bin/python"
    
    # Download Whisper model
    download_script = """
import whisper
import transformers

print("Downloading Whisper base model...")
try:
    model = whisper.load_model("base")
    print("Whisper model downloaded successfully!")
except Exception as e:
    print(f"Error downloading Whisper model: {e}")

print("Downloading sentiment analysis model...")
try:
    from transformers import pipeline
    sentiment_pipeline = pipeline("sentiment-analysis", 
                                model="cardiffnlp/twitter-roberta-base-sentiment-latest")
    print("Sentiment model downloaded successfully!")
except Exception as e:
    print(f"Error downloading sentiment model: {e}")
"""
    
    with open("download_models.py", "w") as f:
        f.write(download_script)
    
    run_command(f"{python_cmd} download_models.py")
    os.remove("download_models.py")

def create_env_file():
    """Create .env file if it doesn't exist"""
    if not os.path.exists(".env"):
        print("Creating .env file...")
        with open(".env", "w") as f:
            f.write("""# Speech-to-Text Sentiment Analysis API Configuration
APP_NAME=Speech Sentiment API
DEBUG=True
SECRET_KEY=change-this-secret-key-in-production
HOST=0.0.0.0
PORT=8000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50MB
STT_METHOD=whisper
WHISPER_MODEL_SIZE=base
SENTIMENT_METHOD=transformers
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
""")
        print(".env file created successfully!")

def run_tests():
    """Run basic tests to verify installation"""
    print("Running basic tests...")
    
    if platform.system().lower() == "windows":
        python_cmd = ".\\venv\\Scripts\\python"
    else:
        python_cmd = "./venv/bin/python"
    
    test_script = """
print("Testing imports...")
try:
    import fastapi
    print(" FastAPI imported successfully")
except ImportError as e:
    print(f" FastAPI import failed: {e}")

try:
    import whisper
    print(" Whisper imported successfully")
except ImportError as e:
    print(f" Whisper import failed: {e}")

try:
    import transformers
    print(" Transformers imported successfully")
except ImportError as e:
    print(f" Transformers import failed: {e}")

try:
    import librosa
    print(" Librosa imported successfully")
except ImportError as e:
    print(f" Librosa import failed: {e}")

print("Basic tests completed!")
"""
    
    with open("test_imports.py", "w") as f:
        f.write(test_script)
    
    run_command(f"{python_cmd} test_imports.py")
    os.remove("test_imports.py")

def main():
    """Main setup function"""
    print(" Speech-to-Text Sentiment Analysis API Setup")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    
    try:
        # Step 1: Install system dependencies
        install_system_dependencies()
        
        # Step 2: Create directories
        create_directories()
        
        # Step 3: Set up Python environment
        if not setup_python_environment():
            print("Setup failed during Python environment setup")
            sys.exit(1)
        
        # Step 4: Create .env file
        create_env_file()
        
        # Step 5: Download models
        download_models()
        
        # Step 6: Run tests
        run_tests()
        
        print("\n" + "=" * 50)
        print("🎉 Setup completed successfully!")
        print("\nTo start the server:")
        if platform.system().lower() == "windows":
            print("  .\\venv\\Scripts\\activate")
        else:
            print("  source venv/bin/activate")
        print("  python main.py")
        print("\nOr run directly:")
        print("  uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        print("\nAPI will be available at: http://localhost:8000")
        print("API documentation: http://localhost:8000/docs")
        
    except KeyboardInterrupt:
        print("\nSetup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nSetup failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()