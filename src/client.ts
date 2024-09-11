/*
 * Author: Réulison
 * 
 * Fortemente influenciado pelo cross storage do Zendesk: https://github.com/zendesk/cross-storage/
 *
 * A diferença nesta biblioteca é que o Hub não controla os direitos de acesso, mas sim o cliente
 * define os direitos de acesso em cada registro. Quando o registro é lido, o hub garante que a janela pai
 * recebeu acesso.
 *
 * Isso torna possível usar um único hub. Você pode simplesmente usar o código e reutilizar um hub que
 * já está hospedado, simplificando a configuração.
 *
 */


// Se o URL do hub não for fornecido, use o do CDN
var _hubUrl: string = "https://cdn.ilkkapeltola.com/global-storage/latest/hub.html";
// um lugar para armazenar funções de retorno de chamada ao fazer solicitações ao Hub
var   _requests: {[k:string]: Function} = {};
// definido como verdadeiro quando o Hub responde com pronto
var   _ready: boolean = false;
const _hostname = (document.location.hostname == "") ? 'localhost' : document.location.hostname;
// o IFrame para conter o Hub
var   _frame: HTMLIFrameElement;
// O init foi chamado? Se sim, não crie outro IFrame
var   _initialized: boolean = false;
// Estilize o IFrame para que ele não fique visível
const _frameStyle = 'display: none; position: absolute; top: -999px; left: -999px;';
// Mantenha a contagem de requisições, caso haja várias simultâneas.
var _count = 0;
// Tempo limite para quando uma solicitação falha
const _timeoutMs = 1000;
// Ao armazenar valores no Hub, as origens permitidas acessam os valores salvos
var   _allow_regex: string;

interface globalStorageOptions {
    url?: string,
    allow?: string
}

export function init(opts: globalStorageOptions = {}) {
    _hubUrl = (!opts.url) ? _hubUrl : opts.url;
    _allow_regex = (!opts.allow) ? _getDomain(_hostname) + "$" : opts.allow;
    // Queremos que a origem atual também corresponda ao opts.allow.
    if (_getDomain(_hostname).match(_allow_regex) == null) {
        
        console.error("A página atual não corresponde ao parâmetro allow.\
        Isso não é permitido, pois qualquer conjunto de chaves nesta página não poderá ser reescrito novamente..");
        return;
    }

    // inicializar apenas uma vez
    if(!_initialized) {
        window.addEventListener('message', _listener, false);
        _frame = _createFrame(_hubUrl);
        _initialized = true;
        var timeout: number;

        // Vamos retornar uma promessa que é resolvida quando o hub envia que está pronta
        return new Promise((res, rej) => {

            // Quero dar um tempo se o Hub não ficar pronto a tempo.
            timeout = window.setTimeout(function() {
                if(!_requests["connect"]) return;
                delete _requests["connect"];
                rej(new Error('Hub timed out. Init failed.'));
            }, _timeoutMs);

            /* Estamos armazenando uma função de retorno de chamada em _requests["connect"] que será
             * chamada por _listener quando o hub estiver pronto. Quando chamado, definimos _ready
             * como true e limpamos o tempo limite.
             */
            _requests["connect"] = function (result: string) {
                _ready = true;
                clearTimeout(timeout);
                delete _requests["connect"];
                res("ready");
            }

        });
    }
    

}

function _listener(message: any) {
    // Ouça a primeira mensagem do Hub, que espero que esteja pronta
    if (message.data == 'global-storage:ready') {
        _requests["connect"]("ready");
    }
    
    // Quando recebemos mensagens do Hub, elas carregam um ID de solicitação
    // Este ID mapeia para uma função de retorno de chamada em _requests. Chame-a para resolver a Promise pendente.
    if (_requests[message.data.id]) {
        _requests[message.data.id](message.data.value, message.data.error);
    }
}

function _request(method: string, params: any) {

    _count++;
    const requestId = "global-storage-request:" + _count;
    var timeout: number;

    return new Promise(
        (res, rej) => {

            if (!_ready) {
                rej(new Error ("Not ready yet. Did you forget to call init() \
                or didn't wait for the Promise to resolve?"));
                return;
            }

            // Novamente, se a promessa não for resolvida a tempo, rejeite-a com um tempo limite
            timeout = window.setTimeout(function() {
                if(!_requests[requestId]) return;
                rej(new Error('Timeout'));
            }, _timeoutMs);

            /* Armazena uma função de retorno de chamada com o requestId:count em _requests
             * Quando o hub responder, poderemos chamar a função de retorno de chamada
             * E assim resolver a Promise pendente.
             */
            _requests[requestId] = function (result: any, error: string) {
                clearTimeout(timeout);
                delete _requests[requestId];
                if (error != null) {
                    rej(error);
                    return;
                }

                try {
                    res(result);
                } catch (e) {
                    console.error(e);
                }
                
            };
            const targetUrl = new URL(_hubUrl);

            _frame.contentWindow.postMessage(
                {
                    id: requestId,
                    allowed_origin: _allow_regex,
                    method: method,
                    key: params.key,
                    value: params.value
                }, targetUrl.origin
            );

        }
    );
    
}

function _createFrame(url: string): HTMLIFrameElement {
    var frame: HTMLIFrameElement;
    frame = window.document.createElement('iframe');
    frame.setAttribute('style', _frameStyle);
    window.document.body.appendChild(frame);
    frame.src = url;
    return frame;
}

export function getItem(key: string) {
    return _request("global-storage:get", {key: key});
}

export function setItem(key: string, value: any) {
    return _request('global-storage:set', {key: key, value: value});
}

export function removeItem(key: string) {
    return _request('global-storage:delete', {key: key});
}

export function clear() {
    return _request('global-storage:clear', {key: "*"})
}

function _getDomain(url: string) {
    if (url == 'localhost') return "localhost";
    url = (url.match('^http') == null ) ? document.location.protocol + "//" + url : url;
    if (!url) return;
  
    var a = document.createElement('a');
    a.href = url;
    
    try {  
      return a.hostname.match(/[^.]*(\.[^.]{2,4}(?:\.[^.]{2,3})?$|\.[^.]{2,8}$)/)[0];
    } catch(e) {}
}