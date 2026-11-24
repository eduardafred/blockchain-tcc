"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractAbi = void 0;
exports.contractAbi = {
    abi: [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "adminInicial",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "instituicaoA",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "instituicaoB",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "secretaria",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [],
            "name": "AccessControlBadConfirmation",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                },
                {
                    "internalType": "bytes32",
                    "name": "neededRole",
                    "type": "bytes32"
                }
            ],
            "name": "AccessControlUnauthorizedAccount",
            "type": "error"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "string",
                    "name": "idProntuario",
                    "type": "string"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "instituicaoDona",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "solicitante",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "AcessoConcedido",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "string",
                    "name": "idProntuario",
                    "type": "string"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "solicitante",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "motivo",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "AcessoSolicitado",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "string",
                    "name": "idProntuario",
                    "type": "string"
                },
                {
                    "indexed": true,
                    "internalType": "string",
                    "name": "idPacienteHash",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "cid",
                    "type": "string"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "instituicao",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "ProntuarioCadastrado",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "secretaria",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "totalRegistrosAnalisados",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "RelatorioEstatisticoGerado",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                },
                {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "previousAdminRole",
                    "type": "bytes32"
                },
                {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "newAdminRole",
                    "type": "bytes32"
                }
            ],
            "name": "RoleAdminChanged",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                }
            ],
            "name": "RoleGranted",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                }
            ],
            "name": "RoleRevoked",
            "type": "event"
        },
        {
            "inputs": [],
            "name": "DEFAULT_ADMIN_ROLE",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "INSTITUICAO_ROLE",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "SECRETARIA_ROLE",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_idProntuario",
                    "type": "string"
                },
                {
                    "internalType": "address",
                    "name": "_solicitante",
                    "type": "address"
                }
            ],
            "name": "autorizarAcesso",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_idPacienteHash",
                    "type": "string"
                }
            ],
            "name": "buscarProntuariosPorPaciente",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "string",
                            "name": "idProntuario",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "hashConteudo",
                            "type": "string"
                        },
                        {
                            "internalType": "address",
                            "name": "instituicaoDona",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "timestamp",
                            "type": "uint256"
                        }
                    ],
                    "internalType": "struct HealthAuditRegistry.ProntuarioResumo[]",
                    "name": "",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_idProntuario",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_idPacienteHash",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_hashConteudo",
                    "type": "string"
                },
                {
                    "internalType": "uint8",
                    "name": "_idade",
                    "type": "uint8"
                },
                {
                    "internalType": "string",
                    "name": "_sexo",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_macroregiao",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_cid",
                    "type": "string"
                }
            ],
            "name": "cadastrarProntuario",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getListaIdsProntuarios",
            "outputs": [
                {
                    "internalType": "string[]",
                    "name": "",
                    "type": "string[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                }
            ],
            "name": "getRoleAdmin",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getTotalProntuarios",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                },
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "grantRole",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                },
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "hasRole",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_idProntuario",
                    "type": "string"
                }
            ],
            "name": "obterDadosEstatisticos",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "macroregiao",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "cid",
                    "type": "string"
                },
                {
                    "internalType": "uint8",
                    "name": "idade",
                    "type": "uint8"
                },
                {
                    "internalType": "string",
                    "name": "sexo",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                },
                {
                    "internalType": "address",
                    "name": "callerConfirmation",
                    "type": "address"
                }
            ],
            "name": "renounceRole",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                },
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "revokeRole",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_idProntuario",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_motivo",
                    "type": "string"
                }
            ],
            "name": "solicitarAcesso",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes4",
                    "name": "interfaceId",
                    "type": "bytes4"
                }
            ],
            "name": "supportsInterface",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_idProntuario",
                    "type": "string"
                },
                {
                    "internalType": "address",
                    "name": "_ator",
                    "type": "address"
                }
            ],
            "name": "verificarPermissao",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
};
//# sourceMappingURL=HealthAuditRegistry.js.map