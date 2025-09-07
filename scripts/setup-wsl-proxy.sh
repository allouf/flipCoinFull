#!/bin/bash

# WSL Proxy Configuration Script for Solana Deployment
# This configures WSL to use your Windows VPN/Proxy

echo "Configuring WSL to use Windows proxy settings..."

# Get Windows host IP (WSL2)
export WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')

# ProtonVPN typically uses these ports - adjust if different
export HTTP_PROXY="http://${WINDOWS_HOST}:8080"
export HTTPS_PROXY="http://${WINDOWS_HOST}:8080"
export http_proxy="${HTTP_PROXY}"
export https_proxy="${HTTPS_PROXY}"
export NO_PROXY="localhost,127.0.0.1"

echo "Proxy configured:"
echo "  HTTP_PROXY: ${HTTP_PROXY}"
echo "  HTTPS_PROXY: ${HTTPS_PROXY}"

# Add to bashrc for persistence
cat >> ~/.bashrc << EOF

# Proxy settings for VPN
export HTTP_PROXY="${HTTP_PROXY}"
export HTTPS_PROXY="${HTTPS_PROXY}"
export http_proxy="${HTTP_PROXY}"
export https_proxy="${HTTPS_PROXY}"
export NO_PROXY="localhost,127.0.0.1"
EOF

# Configure git to use proxy
git config --global http.proxy "${HTTP_PROXY}"
git config --global https.proxy "${HTTPS_PROXY}"

# Configure cargo to use proxy
mkdir -p ~/.cargo
cat >> ~/.cargo/config << EOF
[http]
proxy = "${HTTP_PROXY}"

[https]
proxy = "${HTTPS_PROXY}"
EOF

echo "Proxy configuration complete!"
echo ""
echo "Testing connection..."
curl -I https://google.com

if [ $? -eq 0 ]; then
    echo "✓ Connection successful!"
else
    echo "✗ Connection failed. Please check your ProtonVPN settings."
    echo ""
    echo "Try these alternatives:"
    echo "1. In ProtonVPN, enable 'Split Tunneling' and add WSL"
    echo "2. Or use port 1080 for SOCKS5: export ALL_PROXY=socks5://${WINDOWS_HOST}:1080"
fi