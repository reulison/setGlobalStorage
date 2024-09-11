
var _allow: string = "";
var _allow_empty_origin: boolean;

interface hubOptionsInterface {
    allow?: string,
    allow_empty_origin?: boolean
}
/* init() recebe opts como argumento
* No momento, opts pode ter dois parâmetros: allow e allow_empty_origin
* allow é uma regex das origens que têm permissão para usar o hub.
* Por padrão, todas as origens são permitidas.
* allow_empty_origin permite que páginas que não enviam nenhum dado de referência sejam aceitas.
* Isso não é o ideal, mas você pode precisar para testes.
*/

export function init(opts: hubOptionsInterface = {}) {
    _allow = (!opts.allow) ? ".*" : opts.allow;
    _allow_empty_origin = (!opts.allow_empty_origin) ? false : opts.allow_empty_origin;

    if (document.referrer == '' && !_allow_empty_origin) {

        // Este erro ocorre geralmente quando você abre a página da web do seu sistema de arquivos
        // em um navegador da web (ou seja, não por meio de um servidor web).
        throw new Error("Origem vazia não foi permitida pelo Hub. Verifique o parâmetro 'allow_empty_origin' do hub.");

    } else if (document.referrer != '' && document.referrer.match(_allow) == null) {

        // Este erro ocorre quando o hub não está configurado para aceitar a página de origem.
        throw new Error("Origem não permitida pelo hub. Verifique o parâmetro 'allow' do hub.");

    }  else {
        window.addEventListener('message', _listener, false);
        window.parent.postMessage('global-storage:ready', "*");
    }
}

// Lidar com mensagens recebidas
function _listener(message: MessageEvent ) {
    var result, error;
    var origin = (message.origin == 'null' && _allow_empty_origin) ? '*' : message.origin;

    try {

        _checkOrigin(message);

        if(message.data.method === 'global-storage:set')
            result = _setItem(message);
        else if (message.data.method == 'global-storage:get')
            result = _getItem(message);
        else if (message.data.method == 'global-storage:delete')
            result = _removeItem(message);
        else if (message.data.method == 'global-storage:clear')
            result = _clearStorage(message);

    } catch(e) {
        error = e.message;
    }
    window.parent.postMessage({
        id: message.data.id,
        value: result,
        error: error
    }, origin);

}

//const atob = (str:string) => Buffer.from(str, 'base64').toString('binary');
//const btoa = (str:string) => Buffer.from(str, "binary").toString("base64");

function _checkOrigin(message: MessageEvent) {
    const _remote_host = _getDomain(message.origin);
    const _storeItem = window.localStorage.getItem(message.data.key);
    const _storeObject = (_storeItem == null) ? null : JSON.parse(atob( _storeItem ));

    if (_remote_host == null && _allow_empty_origin) {
        return; // ignorar todas as verificações de origem
    } else if ( _remote_host.match(message.data.allowed_origin) == null) {
        throw new Error("Origem do remetente não permitida pelo próprio remetente. Isso não é permitido. \
        Altere o parâmetro 'allow' de globalStorage.init() para corresponder à sua origem de " + _remote_host);
    } else if (_storeObject != null && _remote_host.match(_storeObject.allowed) == null ) {
        throw new Error("A chave existe, mas não tem permissão para acesso pela sua origem. \
        Use uma chave diferente ou limpe manualmente o localStorage do hub.");
    } else if (_remote_host.match(_allow) == null) {
        throw new Error("Origem não permitida pelo hub");
    }
}

function _setItem(message: MessageEvent) {
    var storeValue: string, error = null, returnValue = true;

    storeValue = btoa(
        JSON.stringify( {
            allowed: message.data.allowed_origin,
            value: message.data.value
        } )
    );

    window.localStorage.setItem(
        message.data.key,        
        storeValue
        );    

    return storeValue;
}

function _getItem(message: MessageEvent) {
    
    const storeItem = window.localStorage.getItem(message.data.key);

    var storeValue = null;

    if (storeItem == null) {
        return null;
    } else {
        try {
            storeValue = JSON.parse(atob(storeItem)).value;
        } catch (e) {
            console.error(e);
        }
    }

    return storeValue;
}

// Exclui o item do armazenamento local
function _removeItem(message: MessageEvent) {
    if (window.localStorage.getItem(message.data.key) == null) {
        throw new Error('Key not found');
    } else {
        window.localStorage.removeItem(message.data.key);
    }
    return true;
}

function _clearStorage(message: MessageEvent) {
    const locanStorageEntries = Object.entries(localStorage);
    for (const idx in locanStorageEntries) {
        const key = locanStorageEntries[idx][0];
        try {
            const item = JSON.parse(atob(locanStorageEntries[idx][1]));
            if (message.origin.match(item.allowed_origin) != null ) {
                localStorage.removeItem(key);
            }
        } catch (e) { console.log(e); }        
    }

    return true;

}

function _getDomain(url: string) {
    if (url == "null") return null;
    const _url = new URL(url);
    const _hostname = _url.hostname;
    if (_hostname == 'localhost') return "localhost";
    try {
        return _hostname.match(/[^.]*(\.[^.]{2,4}(?:\.[^.]{2,3})?$|\.[^.]{2,8}$)/)[0];
    } catch(e) {
        throw new Error("getDomain");
    }
}