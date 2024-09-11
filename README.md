# setGlobalStorage

Enquanto o localStorage é local somente para o domínio em que você está, o globalStorage permite que você armazene e recupere dados em vários domínios. Esteja atento à legislação local e garanta que você use isso eticamente.

## Instalação
clonar o repositório e execute:
```shell
npm install
npm run build
```
Você encontrará os arquivos javascript necessários em **./dist/**

Incluir do CDN
Você pode simplesmente incluir o arquivo do CDN: https://cdn.ilkkapeltola.com/global-storage/latest/globalStorage.js

Fazer isso funcionará bem, mas depende de um documento HTML do hub hospedado.

## Via CDN
Você pode simplesmente incluir o arquivo do CDN: https://cdn.jsdelivr.net/npm/setglobalstorage/dist/globalStorage.js

Fazer isso funcionará bem, mas depende de um documento HTML do hub hospedado.

##  Uso
### Início rápido
Para usar o `globalStorage`, você pode simplesmente incluir o javascript mais recente do CDN, sem nenhuma configuração, e ele funcionará.

Aqui está um exemplo. Você pode copiar e colar esse código na sua página:

```html
<script src="https://cdn.jsdelivr.net/npm/setglobalstorage/dist/globalStorage.js"></script>
<script>
    globalStorage.init().then(() => {
        globalStorage.setItem("foo", "car");
    });
</script>
```
E esso em outro:

```html
<script src="https://cdn.jsdelivr.net/npm/setglobalstorage/dist/globalStorage.js"></script>
<script>
    globalStorage.init().then( () => {
            return globalStorage.getItem("foo");
        }).then( (r) => {
            console.log(r);
        });
</script>
```
## Configuração
### O cliente

O cliente, `globalStorage`, aceita um único parâmetro de objeto options no método `init`. O objeto options tem duas chaves, ambas opcionais:

```javascript
const opts = {
    url: "https://url.to.the/hub.html",
    allow: "yourdomain.com"
}

globalStorage.init(opts).then(() => {
    // stuff to do after init
})
```

A chave url armazena a URL para o hub. Se não for fornecida, uma url padrão para o hub hospedado será usada. A chave **allow** armazena o regex para origens permitidas, a ser salvo com cada chave armazenada. O hub não permitirá a leitura de chaves onde o regex **allow** armazenado não corresponde à origem solicitante. Por padrão, o allow é definido para seu domínio, então, desde que as solicitações venham do mesmo domínio ou de seus subdomínios, elas serão permitidas. No entanto, você pode especificar o regex **allow** para corresponder a vários domínios.

### O hub
O hub, `globalStorageHub`, aceita também um único parâmetro de objeto `options` no método `init`. O objeto `hub` options tem duas chaves, também opcionais:

```javascript
const options = {
    allow: "yourdomain.com",
    allow_empty_origin: false
}

globalStorageHub.init(options);
```

Quando o cliente chama `init()`, um IFrame é criado, no qual o hub é carregado. Quando o hub chama `init()`, e o parâmetro allow é passado, o hub verifica se o `document.referrer` (que é a URL da janela pai) corresponde ao regex **allow**. Caso contrário, o hub se recusa a inicializar e não aceitará nenhuma solicitação.

Se por algum motivo o `postMessage` que o IFrame recebe não carrega informações de origem (isso acontece, por exemplo, se o arquivo HTML do cliente foi executado a partir do sistema de arquivos e não por meio de um servidor web), por padrão, essas solicitações são rejeitadas. No entanto, se você deseja aceitar essas solicitações pelo Hub, defina `allow_empty_origin` como `true`.