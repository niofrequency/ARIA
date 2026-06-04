import modal

app = modal.App("aria-platform")

# Define a custom container image with Node.js and TypeScript runner
node_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("curl")
    .run_commands("curl -fsSL https://deb.nodesource.com/setup_20.x | bash -")
    .apt_install("nodejs")
    .run_commands("npm install -g tsx typescript")
)

# Mount the source code into the Modal container
project_mount = modal.Mount.from_local_dir(
    local_path=".",
    remote_path="/app",
    ignore=["node_modules", "dist", ".vercel", ".env", ".env.local"]
)

@app.function(
    image=node_image,
    mounts=[project_mount],
    secrets=[
        # Injects the environment variables stored in Modal
        modal.Secret.from_name("aria-secrets")
    ],
    allow_concurrent_inputs=50,
    keep_warm=1  # Optional: keeps one instance running to avoid cold starts
)
@modal.web_server(port=8000, startup_timeout=120)
def run_aria():
    import subprocess
    
    # 1. Install Express packages required for the wrapper
    print("Installing server dependencies...")
    subprocess.run(
        ["npm", "install", "express", "cors", "@types/express", "@types/cors"], 
        cwd="/app", check=True
    )
    
    # 2. Install project dependencies
    print("Installing project dependencies...")
    subprocess.run(["npm", "install"], cwd="/app", check=True)
    
    # 3. Build the Vite React Frontend
    print("Building ARIA UI...")
    subprocess.run(["npm", "run", "build"], cwd="/app", check=True)
    
    # 4. Start the Express server
    print("Initializing Neural Bridge & Web Server...")
    subprocess.Popen(["tsx", "server.ts"], cwd="/app")
