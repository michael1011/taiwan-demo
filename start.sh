#!/bin/bash

bitcoin_container='boltz-bitcoin'
bitcoin_config='--conf=/config/bitcoin.conf'

print_header() {
    echo "------"
    echo "Starting $1"
    echo "------"
    echo ""
}

print_header "Bitcoin Core"

echo "Creating container"
docker run -v `pwd`/docker:/config -d --name $bitcoin_container -p 18443:18443 boltz/bitcoin-core:28.0 $bitcoin_config > /dev/null

sleep 1

echo "Creating wallet"
docker exec $bitcoin_container bitcoin-cli --regtest $bitcoin_config createwallet default > /dev/null

