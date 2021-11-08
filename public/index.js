const textArea = document.getElementById('problem-spec');

let title = null;
function parseURLParams(){
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    if(params.title != null){
        document.getElementById('problem-title').innerHTML = 'SIMPLEX - ' + params.title;
        title = params.title;
    }
    const problem = parseInlineParams(params);
    if(problem == null){
        if (history.pushState) {
            const queryString = 'd=min&c=1,1,-4&A=1,1,2;1,1,-1;-1,1,1&o=le,le,le&b=9,2,4' + (title != null ? '&title=' + title: '');
            var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + queryString;
            if(newurl != window.location){
                window.location = newurl;
            }
        }
        
        return;
    }
    console.log(problem);
    const structuredText = problemToStructuredText(problem)
    let rows = structuredText.split('\n').length;
    
    textArea.rows = rows;
    textArea.innerHTML = structuredText;
}

function parseInlineParams(params){
    d = params.d;
    if(d == null){
        d = params.D;
    }
    c = params.c;
    if(c == null){
        c = params.C;
    }
    a = params.a;
    if(a == null){
        a = params.A;
    }
    b = params.b;
    if(b == null){
        b = params.B;
    }

    o = params.o;
    if(o == null){
        o = params.O;
    }

    if(d == null || c == null || a == null || c == null || o == null){
        return null;
    }
    if(d != 'min' && d != 'max'){
        console.log('Objetivo não definido');
        return null;
    }

    o = o.split(',');
    a = parseMatrix(a);
    b = parseArray(b);
    c = parseArray(c);

    if(a.length != b.length){
        console.log("Quantidade de valores de restrições diferente da quantidade de restrições");
        return null;
    }

    if(a.length != o.length){
        console.log("Quantidade de valores de restrições diferente da quantidade de operadores");
        return null;
    }

    if(a[0].length != c.length){
        console.log("Quantidade de variáveis de custo diferente da quantidade de variáveis de restrições");
        return null;
    }

    for(var i = 1; i < a.length; i++){
        if(a[0].length != a[i].length){
            console.log("Quantidade de variáveis especificadas nas restrições difere de uma restrição para outra");
            return null;
        }
    }

    const problem = {d:d, a:a, b:b, c:c, o:o};
    
    return problem;
}

function parseArray(a){
    a = a.split(',');
    for(var i = 0; i < a.length; i++){
        a[i] = +a[i];
    }
    return a;
}

function parseMatrix(a){
    rows = a.split(';');
    a = new Array(rows.length);
    for(var i = 0; i < a.length; i++){
        a[i] = parseArray(rows[i]);
    }
    return a;
}

function problemToStructuredText(problem){

    let a = 'a=[' + problem.a[0].join(',')
    for(var i = 1; i < problem.a.length; i++){
        a += '\n   ' + problem.a[i].join(',');
    }
    a += ']'


    let c = 'c=[' + problem.c.join(',') + ']';
    let b = 'b=[' + problem.b.join(',') + ']';
    let d = 'd=' + problem.d
    let o = 'o=[' + problem.o.map(x => operatorNameToSign(x)).join(',') + ']';

    let structured = d + '\n' + c + '\n' + a + '\n' + o + '\n' + b;
    return structured;
}

function structuredTextToProblem(structuredText){
    structuredText = structuredText.replaceAll(' ', '');
    let cursor = 0;
    let d = null, c = null, a = null, b = null, o = null;
    while(cursor < structuredText.length - 1){
        let currentChar = structuredText.substring(cursor, cursor + 1);
        let nextChar = structuredText.substring(cursor + 1, cursor + 2);
        if(nextChar != '='){
            cursor++;
            continue;
        }

        if(currentChar == 'd'){
            let direction = structuredText.substring(cursor + 2, cursor + 2 +3);
            if(direction == 'min'){
                d = 'min';
            } else if(direction == 'max'){
                d = 'max'
            } else {
                throw 'Parâmetro direção (d) possui valor inválido';
            }
            cursor += 5;
        } else {
            let start = structuredText.indexOf('[', cursor) + 1;
            let end = structuredText.indexOf(']', start);
            let content = structuredText.substring(start, end);
            content = content.replaceAll('\n', ';');
            content = content.replaceAll(' ', '');

            cursor = end + 1;

            if(currentChar == 'c'){
                c = parseArray(content)
            } else if(currentChar == 'a'){
                a = parseMatrix(content)
            } else if(currentChar == 'b'){
                b = parseArray(content)
            } else if(currentChar == 'o'){
                o = content.split(',');
            }
        }
    }

    problem = {d:d, a:a, b:b, c:c, o:o};

    return problem;
}

function operatorNameToSign(name){
    if(name == 'eq'){
        return '=';
    }
    if(name == 'ge'){
        return '>=';
    }
    if(name == 'gt'){
        return '>';
    }
    if(name == 'lt'){
        return '<';
    }
    if(name == 'le'){
        return '<=';
    }
    if(name == 'ne'){
        return '!=';
    }
    return 'OPERATOR_ERROR';
}

function operatorSignToName(name){
    if(name == '='){
        return 'eq';
    }
    if(name == '>='){
        return 'ge';
    }
    if(name == '>'){
        return 'gt';
    }
    if(name == '<'){
        return 'lt';
    }
    if(name == '<='){
        return 'le';
    }
    if(name == '!='){
        return 'ne';
    }
    return 'OPERATOR_ERROR';
}

function problemToInLineText(problem){
    let a = 'a=' + problem.a[0].join(',');
    for(let i = 1; i < problem.a.length; i++){
        a += ';' + problem.a[i].join(',');
    }
    let b = 'b=' + problem.b.join(',');
    let c = 'c=' + problem.c.join(',');

    let o = 'o=' + problem.o.map(x => operatorSignToName(x)).join(',');

    let d = 'd=' + problem.d;

    let plainText = d + '&' + c + '&' + a + '&' + o + '&' + b;
    return plainText;
}

function solve(){
    document.getElementById('simplex-container').innerHTML = '';
    let structuredText = textArea.value;
    let problem = structuredTextToProblem(structuredText);
    plainText = problemToInLineText(problem);
    if (history.pushState) {
        var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + plainText + (title != null ? '&title=' + title: '');
        if(newurl != window.location){
            window.history.pushState({path:newurl},'',newurl);
        }
    }
    console.log('solve problem:', problem);

    let s = new Simplex(problem.d, problem.c, problem.a, problem.o, problem.b);
    let count = 0;
    while(s.finished == false && count < 1000){
        executeNextStep(s);
        count++;
    }
    
}

function executeNextStep(s){
    let step = s.nextStep();
    let stepContainer = step.toHTML();
    let container = document.getElementById('simplex-container');
    container.insertBefore(stepContainer, container.firstChild);
}

parseURLParams();

