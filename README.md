# 🏎️ F1 Calendar Explorer

Um site para explorar o calendário de corridas de Fórmula 1, com dados históricos desde 1950 até a temporada atual.

## 📋 Funcionalidades

- **Calendário de Corridas**: Visualize todas as corridas de uma temporada
- **Dados Históricos**: Acesse informações desde 1950 até hoje
- **Informações Detalhadas**: Circuitos, datas, sessões (treinos, quali, sprint)
- **Exportar JSON**: Baixe os dados em formato JSON
- **API REST**: Endpoints para integração com outros sistemas

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18 ou superior

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Leonardo-781/F1.git
cd F1/f1-site

# Instale as dependências
npm install

# Inicie o servidor
npm start
```

O servidor vai rodar em `http://localhost:3000`

### Modo Desenvolvimento

```bash
npm run dev
```

## 📡 API Endpoints

### Calendário de Corridas
```
GET /api/calendar/:year
```
Exemplo: `/api/calendar/2024` ou `/api/calendar/current`

### Pilotos
```
GET /api/drivers/:year
```

### Equipes (Construtores)
```
GET /api/constructors/:year
```

### Classificação de Pilotos
```
GET /api/standings/drivers/:year
```

### Classificação de Construtores
```
GET /api/standings/constructors/:year
```

### Health Check
```
GET /api/health
```

## 🔧 Tecnologias

- **Backend**: Node.js + Express
- **Frontend**: HTML5 + CSS + JavaScript Vanilla
- **APIs de Dados**:
  - [Ergast API](http://ergast.com/mrd/) - Dados históricos completos
  - [OpenF1 API](https://openf1.org/) - Dados em tempo real (2023+)

## 📁 Estrutura do Projeto

```
f1-site/
├── package.json      # Dependências e scripts
├── server.js         # Servidor Express (proxy + API)
└── public/
    └── index.html    # Frontend da aplicação
```

## 📝 Licença

Este projeto é open source e usa dados públicos das APIs Ergast e OpenF1.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas features
- Enviar pull requests

---

Feito com ❤️ para fãs de F1