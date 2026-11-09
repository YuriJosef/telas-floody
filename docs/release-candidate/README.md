# Floody 2.0 — Apresentação do MVP

Versão candidata para a apresentação de **quarta-feira, 11 de novembro de 2026**. Floody organiza informações sobre chuva e alagamentos no Recife e permite consultar rotas viárias e registrar ocorrências no próprio dispositivo.

[Relatório visual em PDF](floody-2.0-apresentacao-mvp.pdf) · [Auditoria técnica](AUDIT.md) · [Resultados de validação](VALIDATION.md)

O redesenho segue a direção Material 3 Expressive já aprovada, com superfícies tonais, formas que diferenciam ações e estados, tipografia Google Sans Flex e temas claro e escuro. A web usa navegação lateral no desktop e inferior no celular. O app nativo tem interface React Native própria, com ícones Material Symbols e navegação inferior.

| Tela | Desktop web · claro | Celular web · escuro |
| --- | --- | --- |
| Entrada sem conta | [1440 × 900](screenshots/web-desktop-01-entrada-light-demo.png) | [390 × 844](screenshots/web-mobile-01-entrada-dark-demo.png) |
| Painel | [Avisos e precipitação](screenshots/web-desktop-02-painel-light-demo.png) | [Avisos](screenshots/web-mobile-02-painel-dark-demo.png) · [Precipitação e atalhos](screenshots/web-mobile-03-precipitacao-dark-demo.png) |
| Mapa e rotas | [Mapa e planejador](screenshots/web-desktop-04-mapa-rota-light-demo.png) | [Mapa](screenshots/web-mobile-04-mapa-rota-dark-demo.png) · [Planejador](screenshots/web-mobile-05-planejador-dark-demo.png) |
| Relato | [Formulário](screenshots/web-desktop-06-relato-light-demo.png) · [Confirmação](screenshots/web-desktop-07-relato-salvo-light-demo.png) | [Formulário](screenshots/web-mobile-06-relato-dark-demo.png) · [Confirmação](screenshots/web-mobile-07-relato-salvo-dark-demo.png) |
| Garagem | [Veículo salvo](screenshots/web-desktop-08-garagem-light-demo.png) | [Veículo salvo](screenshots/web-mobile-08-garagem-dark-demo.png) |

As **14 capturas** mostram a aplicação web em execução. A demonstração usa resposta vazia de avisos, precipitação simulada, posição de teste, um relato fictício identificado no formulário e um veículo de exemplo. As ruas são do OpenStreetMap e o traçado vem de uma resposta real do OSRM, reproduzida no teste. Os valores de exemplo não descrevem as condições atuais. As capturas de celular são da web responsiva. A execução em iPhone ou Android não foi capturada neste ambiente.

**O que foi verificado.** No navegador, funcionaram a entrada, a navegação, a rolagem, a seleção de local, a exibição e limpeza de rota, o relato pendente e a garagem com persistência local. A consulta direta ao OSRM foi verificada separadamente no navegador. As sondagens do Open-Meteo, RadarMeteorológico e FIPE verificaram respostas de rede pontuais. Os testes de serviço passaram em 18 de 18 casos. Os bundles Hermes para iOS e Android incluíram a fonte e os 13 ícones nativos. Uma exportação bem-sucedida valida o empacotamento, enquanto GPS, gestos e renderização no aparelho exigem teste físico.

**Limites para a apresentação.** Os avisos regionais e a precipitação modelada não confirmam alagamento em uma rua. A rota segue a malha viária, sem avaliação de alagamentos. Relatos e veículos ficam no navegador ou aparelho usado. O relato não é publicado nem encaminhado a autoridades.

**Depois da apresentação.** Adequar a busca de endereços à política do provedor, testar iOS e Android em aparelhos, revisar quando o acompanhamento GPS termina, identificar o mapa de rua quando o satélite falha e tornar os relatos pendentes consultáveis na web.
