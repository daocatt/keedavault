#!/bin/bash

# Create a self-signed certificate for code signing
# This is for development/testing only, not for distribution

CERT_NAME="KeedaVault Developer"

echo "🔐 Creating self-signed certificate for KeedaVault..."
echo ""

# Create a temporary file for the certificate configuration
cat > /tmp/cert_config.txt << EOF
[ req ]
default_bits = 2048
distinguished_name = req_distinguished_name
x509_extensions = v3_ca

[ req_distinguished_name ]
commonName = Common Name
commonName_default = ${CERT_NAME}

[ v3_ca ]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
extendedKeyUsage = critical,codeSigning
EOF

# Generate the certificate
openssl req -x509 -newkey rsa:2048 -keyout /tmp/key.pem -out /tmp/cert.pem -days 365 -nodes -subj "/CN=${CERT_NAME}" -config /tmp/cert_config.txt

# Convert to p12 format
openssl pkcs12 -export -out /tmp/cert.p12 -inkey /tmp/key.pem -in /tmp/cert.pem -passout pass:

# Import to keychain
security import /tmp/cert.p12 -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign -T /usr/bin/security

# Trust the certificate
security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain-db /tmp/cert.pem

# Clean up
rm /tmp/cert.pem /tmp/key.pem /tmp/cert.p12 /tmp/cert_config.txt

echo ""
echo "✅ Certificate created and installed!"
echo ""
echo "Certificate name: ${CERT_NAME}"
echo ""
echo "Verify with:"
echo "  security find-identity -v -p codesigning"
