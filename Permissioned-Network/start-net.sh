#!/bin/bash

# Direciona para a pasta do projeto
DIR="/home/eduardafrdrc/blockchain-tcc/Permissioned-Network"
BOOTNODE="enode://5eaffa75226ede773759edf0bba4f074ca5fc49c7d00b72d171052b80d1988f488db20144c5f38e30ba73240e9fe7573d6fc6192bbf3d5fc705b5c30c0efd69f@127.0.0.1:30303"

echo "Iniciando Nó 1..."
besu --data-path=$DIR/Node-1/data \
     --genesis-file=$DIR/genesis.json \
     --rpc-http-enabled \
     --rpc-http-api=ETH,NET,IBFT \
     --rpc-http-host=0.0.0.0 \
     --host-allowlist="*" \
     --rpc-http-cors-origins="all" \
     --rpc-http-port=8546 \
     --metrics-enabled \
     --metrics-host=0.0.0.0 \
     --metrics-port=9545 \
     --min-gas-price=0 \
     --permissions-nodes-config-file=$DIR/permissions_config.toml \
     --permissions-nodes-config-file-enabled=true \
     --permissions-accounts-config-file=$DIR/permissions_config.toml \
     --permissions-accounts-config-file-enabled=true > $DIR/Node-1/node.log 2>&1 &


echo "Iniciando Nó 2..."
besu --data-path=$DIR/Node-2/data \
     --genesis-file=$DIR/genesis.json \
     --bootnodes=$BOOTNODE \
     --p2p-port=30304 \
     --rpc-http-enabled \
     --rpc-http-api=ETH,NET,IBFT \
     --rpc-http-host=0.0.0.0 \
     --host-allowlist="*" \
     --rpc-http-cors-origins="all" \
     --rpc-http-port=8547 \
     --metrics-enabled \
     --metrics-host=0.0.0.0 \
     --metrics-port=9546 \
     --min-gas-price=0 \
     --permissions-nodes-config-file=$DIR/permissions_config.toml \
     --permissions-nodes-config-file-enabled=true \
     --permissions-accounts-config-file=$DIR/permissions_config.toml \
     --permissions-accounts-config-file-enabled=true > $DIR/Node-2/node.log 2>&1 &

echo "Iniciando Nó 3..."
besu --data-path=$DIR/Node-3/data \
     --genesis-file=$DIR/genesis.json \
     --bootnodes=$BOOTNODE \
     --p2p-port=30305 \
     --rpc-http-enabled \
     --rpc-http-api=ETH,NET,IBFT \
     --rpc-http-host=0.0.0.0 \
     --host-allowlist="*" \
     --rpc-http-cors-origins="all" \
     --rpc-http-port=8548 \
     --metrics-enabled \
     --metrics-host=0.0.0.0 \
     --metrics-port=9547 \
     --min-gas-price=0 \
     --permissions-nodes-config-file=$DIR/permissions_config.toml \
     --permissions-nodes-config-file-enabled=true \
     --permissions-accounts-config-file=$DIR/permissions_config.toml \
     --permissions-accounts-config-file-enabled=true > $DIR/Node-3/node.log 2>&1 &

echo "Iniciando Nó 4..."
besu --data-path=$DIR/Node-4/data \
     --genesis-file=$DIR/genesis.json \
     --bootnodes=$BOOTNODE \
     --p2p-port=30306 \
     --rpc-http-enabled \
     --rpc-http-api=ETH,NET,IBFT \
     --rpc-http-host=0.0.0.0 \
     --host-allowlist="*" \
     --rpc-http-cors-origins="all" \
     --rpc-http-port=8549 \
     --metrics-enabled \
     --metrics-host=0.0.0.0 \
     --metrics-port=9548 \
     --min-gas-price=0 \
     --permissions-nodes-config-file=$DIR/permissions_config.toml \
     --permissions-nodes-config-file-enabled=true \
     --permissions-accounts-config-file=$DIR/permissions_config.toml \
     --permissions-accounts-config-file-enabled=true > $DIR/Node-4/node.log 2>&1 &

     echo "Iniciando Nó 5..."
besu --data-path=$DIR/Node-5/data \
     --genesis-file=$DIR/genesis.json \
     --bootnodes=$BOOTNODE \
     --p2p-port=30307 \
     --rpc-http-enabled \
     --rpc-http-api=ETH,NET,IBFT \
     --rpc-http-host=0.0.0.0 \
     --host-allowlist="*" \
     --rpc-http-cors-origins="all" \
     --rpc-http-port=8550 \
     --metrics-enabled \
     --metrics-host=0.0.0.0 \
     --metrics-port=9549 \
     --min-gas-price=0 \
     --permissions-nodes-config-file=$DIR/permissions_config.toml \
     --permissions-nodes-config-file-enabled=true \
     --permissions-accounts-config-file=$DIR/permissions_config.toml \
     --permissions-accounts-config-file-enabled=true > $DIR/Node-5/node.log 2>&1 &



echo "Todos os nós foram iniciados em background!"