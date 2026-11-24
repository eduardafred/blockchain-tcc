// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract HealthAuditRegistry is AccessControl {

    bytes32 public constant INSTITUICAO_ROLE = keccak256("INSTITUICAO_ROLE");
    bytes32 public constant SECRETARIA_ROLE = keccak256("SECRETARIA_ROLE");

    struct Prontuario {
        string idPacienteHash;     
        string hashConteudo;       
        address instituicaoDona;   
        uint256 timestamp;        

        uint8 idade;              
        string sexo;               
        string macroregiao;       
        string cid;                
    }

    mapping(string => Prontuario) private prontuarios;
    mapping(string => mapping(address => bool)) private permissoesAcesso;
    mapping(string => string[]) private prontuariosPorPaciente;
    mapping(string => string[]) private prontuariosPorCid;
    string[] private listaIdsProntuarios;

    // Eventos
    event ProntuarioCadastrado(
        string indexed idProntuario,
        string indexed idPacienteHash,
        string cid,
        address indexed instituicao,
        uint256 timestamp
    );

    struct ProntuarioResumo {
        string idProntuario;
        string hashConteudo;
        address instituicaoDona;
        uint256 timestamp;
    }

    event AcessoSolicitado(
        string indexed idProntuario,
        address indexed solicitante,
        string motivo,
        uint256 timestamp
    );

    event AcessoConcedido(
        string indexed idProntuario,
        address indexed instituicaoDona,
        address indexed solicitante,
        uint256 timestamp
    );

    event RelatorioEstatisticoGerado(
        address indexed secretaria,
        uint256 totalRegistrosAnalisados,
        uint256 timestamp
    );

    constructor(address adminInicial, address instituicaoA, address instituicaoB, address secretaria) {
        _grantRole(DEFAULT_ADMIN_ROLE, adminInicial);
        _grantRole(INSTITUICAO_ROLE, instituicaoA);
        _grantRole(INSTITUICAO_ROLE, instituicaoB);
        _grantRole(SECRETARIA_ROLE, secretaria);
    }

    function cadastrarProntuario(
        string memory _idProntuario,
        string memory _idPacienteHash,
        string memory _hashConteudo,
        uint8 _idade,
        string memory _sexo,
        string memory _macroregiao,
        string memory _cid
    ) external onlyRole(INSTITUICAO_ROLE) {
        require(prontuarios[_idProntuario].instituicaoDona == address(0), "Prontuario ja cadastrado.");

        require(bytes(_idPacienteHash).length == 66, "Hash de paciente invalido");
        require(bytes(_hashConteudo).length > 0, "Hash de conteudo obrigatorio");
        require(_idade > 0, "Idade obrigatoria.");
        require(bytes(_sexo).length > 0, "Sexo obrigatorio.");
        require(bytes(_macroregiao).length > 0, "Macroregiao obrigatorio.");
        require(bytes(_cid).length > 0, "CID obrigatorio.");

        prontuarios[_idProntuario] = Prontuario({
            idPacienteHash: _idPacienteHash,
            hashConteudo: _hashConteudo,
            instituicaoDona: msg.sender,
            timestamp: block.timestamp,
            idade: _idade,
            sexo: _sexo,
            macroregiao: _macroregiao,
            cid: _cid
        });

        listaIdsProntuarios.push(_idProntuario);
        prontuariosPorPaciente[_idPacienteHash].push(_idProntuario);
        prontuariosPorCid[_cid].push(_idProntuario);

        emit ProntuarioCadastrado(_idProntuario, _idPacienteHash, _cid, msg.sender, block.timestamp);
    }

    function buscarProntuariosPorPaciente(string memory _idPacienteHash) 
        external view 
        onlyRole(INSTITUICAO_ROLE)
        returns (ProntuarioResumo[] memory) 
    {

        string[] memory ids = prontuariosPorPaciente[_idPacienteHash];
        ProntuarioResumo[] memory resumos = new ProntuarioResumo[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            string memory id = ids[i];
            Prontuario memory p = prontuarios[id];

            resumos[i] = ProntuarioResumo({
                idProntuario: id,
                hashConteudo: p.hashConteudo,
                instituicaoDona: p.instituicaoDona,
                timestamp: p.timestamp
            });
        }

        return resumos;
    }

    function solicitarAcesso(string memory _idProntuario, string memory _motivo) 
        external 
        onlyRole(INSTITUICAO_ROLE) 
    {
        Prontuario memory p = prontuarios[_idProntuario];
        require(bytes(prontuarios[_idProntuario].idPacienteHash).length > 0, "Prontuario nao existe.");
        require(p.instituicaoDona != msg.sender, "O proprietario nao pode solicitar acesso ao proprio prontuario.");

        emit AcessoSolicitado(_idProntuario, msg.sender, _motivo, block.timestamp);
    }

    function autorizarAcesso(string memory _idProntuario, address _solicitante) 
        external 
        onlyRole(INSTITUICAO_ROLE) 
    {
        Prontuario memory p = prontuarios[_idProntuario];
        require(p.instituicaoDona == msg.sender, "Apenas a instituicao dona pode autorizar acesso.");
        require(_solicitante != msg.sender, "Nao e necessario conceder acesso a si mesmo.");
        require(hasRole(INSTITUICAO_ROLE, _solicitante), "Solicitante deve ser uma instituicao autorizada.");
        
        permissoesAcesso[_idProntuario][_solicitante] = true;

        emit AcessoConcedido(_idProntuario, msg.sender, _solicitante, block.timestamp);
    }

    function verificarPermissao(string memory _idProntuario, address _ator) public view returns (bool) {
        Prontuario memory p = prontuarios[_idProntuario];
        if (p.instituicaoDona == _ator) return true;
        return permissoesAcesso[_idProntuario][_ator];
    }

    function getTotalProntuarios() external view returns (uint256) {
        return listaIdsProntuarios.length;
    }

    function getListaIdsProntuarios() public view returns (string[] memory) {
    require(
        hasRole(INSTITUICAO_ROLE, msg.sender) || hasRole(SECRETARIA_ROLE, msg.sender),
        "Acesso negado."
    );
        return listaIdsProntuarios;
    }

    function obterDadosEstatisticos() 
        external 
        view 
        onlyRole(SECRETARIA_ROLE) 
        returns (Prontuario[] memory registros, uint256 timestampConsulta) 
    {
        uint256 total = listaIdsProntuarios.length;
        registros = new Prontuario[](total);

        for (uint256 i = 0; i < total; i++) {
            registros[i] = prontuarios[listaIdsProntuarios[i]];
        }

        return (registros, block.timestamp);
    }

    function obterEstatisticasPorCid(string memory _cid) 
        external 
        view 
        onlyRole(SECRETARIA_ROLE) 
        returns (Prontuario[] memory registros, uint256 timestampConsulta) 
    {
        string[] memory ids = prontuariosPorCid[_cid];
        registros = new Prontuario[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            registros[i] = prontuarios[ids[i]];
        }

        return (registros, block.timestamp);
    }

}