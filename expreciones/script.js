class TreeNode {
    constructor(val) { this.val = val; this.left = this.right = null; this.x = this.y = 0; }
}

const isOp = t => ['+', '-', '*', '/', '^'].includes(t);
const isOperand = t => /^[A-Za-z0-9.\$#]+$/.test(t);
const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };

function tokenize(expr) {
    const tokens = expr.match(/[A-Za-z0-9.\$#]+|[+\-*\/^()]/g) || [];
    if (tokens.join('') !== expr.replace(/\s+/g, '')) throw new Error("Caracteres inválidos.");
    return tokens;
}

function infixToPostfix(tokens) {
    let out = [], opStack = [];
    for (let t of tokens) {
        if (isOperand(t)) out.push(t);
        else if (t === '(') opStack.push(t);
        else if (t === ')') {
            while (opStack.length && opStack[opStack.length - 1] !== '(') out.push(opStack.pop());
            if (!opStack.length) throw new Error("Paréntesis desbalanceados.");
            opStack.pop();
        } else if (isOp(t)) {
            while (opStack.length && isOp(opStack[opStack.length - 1]) && 
                  ((t !== '^' && precedence[opStack[opStack.length - 1]] >= precedence[t]) ||
                   (t === '^' && precedence[opStack[opStack.length - 1]] > precedence[t]))) {
                out.push(opStack.pop());
            }
            opStack.push(t);
        }
    }
    while (opStack.length) {
        let op = opStack.pop();
        if (op === '(' || op === ')') throw new Error("Paréntesis desbalanceados.");
        out.push(op);
    }
    return out;
}

function infixToPrefix(tokens) {
    let rev = [...tokens].reverse().map(t => t === '(' ? ')' : t === ')' ? '(' : t);
    return infixToPostfix(rev).reverse();
}

function postfixToInfix(tokens) {
    let stack = [];
    for (let t of tokens) {
        if (isOperand(t)) stack.push(t);
        else if (isOp(t)) {
            if (stack.length < 2) throw new Error("Expresión posfija malformada.");
            let r = stack.pop(), l = stack.pop();
            stack.push(`(${l} ${t} ${r})`);
        }
    }
    if (stack.length !== 1) throw new Error("Expresión posfija malformada.");
    return tokenize(stack[0]);
}

function prefixToInfix(tokens) {
    let stack = [];
    for (let i = tokens.length - 1; i >= 0; i--) {
        let t = tokens[i];
        if (isOperand(t)) stack.push(t);
        else if (isOp(t)) {
            if (stack.length < 2) throw new Error("Expresión prefija malformada.");
            let l = stack.pop(), r = stack.pop();
            stack.push(`(${l} ${t} ${r})`);
        }
    }
    if (stack.length !== 1) throw new Error("Expresión prefija malformada.");
    return tokenize(stack[0]);
}

function buildTree(tokens, type) {
    let stack = [];
    let isPre = type === 'prefix';
    let iter = isPre ? [...tokens].reverse() : tokens;

    for (let t of iter) {
        if (isOperand(t)) stack.push(new TreeNode(t));
        else if (isOp(t)) {
            if (stack.length < 2) throw new Error("Estructura de expresión inválida para el árbol.");
            let node = new TreeNode(t);
            if (isPre) {
                node.left = stack.pop();
                node.right = stack.pop();
            } else {
                node.right = stack.pop();
                node.left = stack.pop();
            }
            stack.push(node);
        }
    }
    if (stack.length !== 1) throw new Error("No se pudo construir el árbol.");
    return stack[0];
}

function layoutTree(root) {
    let x = 0;
    (function inorder(n, d) {
        if (!n) return;
        inorder(n.left, d + 1);
        n.x = (x++) * 70;
        n.y = d * 80;
        inorder(n.right, d + 1);
    })(root, 0);

    let min = Infinity, max = -Infinity;
    (function bounds(n) {
        if (!n) return;
        if (n.x < min) min = n.x;
        if (n.x > max) max = n.x;
        bounds(n.left); bounds(n.right);
    })(root);

    let offset = (min + max) / 2;
    (function shift(n) {
        if (!n) return;
        n.x -= offset;
        shift(n.left); shift(n.right);
    })(root);
}

function renderTree(root) {
    const eGrp = document.getElementById('edgesGroup'), nGrp = document.getElementById('nodesGroup');
    eGrp.innerHTML = ''; nGrp.innerHTML = '';
    if (!root) return;

    (function draw(n) {
        if (!n) return;
        [n.left, n.right].forEach(child => {
            if (child) {
                let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', n.x); line.setAttribute('y1', n.y);
                line.setAttribute('x2', child.x); line.setAttribute('y2', child.y);
                line.setAttribute('stroke', '#64748b'); line.setAttribute('stroke-width', '2');
                eGrp.appendChild(line);
                draw(child);
            }
        });
        let g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${n.x}, ${n.y})`);
        
        let c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('r', '20'); c.setAttribute('fill', isOp(n.val) ? '#3b82f6' : '#10b981');
        
        let txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('dy', '.3em'); txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('fill', '#fff'); txt.setAttribute('font-weight', 'bold');
        txt.textContent = n.val;

        g.appendChild(c); g.appendChild(txt);
        nGrp.appendChild(g);
    })(root);
    resetZoom();
}

// Interacción Pan & Zoom
let panX = 0, panY = 50, scale = 1, dragging = false, startX = 0, startY = 0;
const svg = document.getElementById('treeSvg'), zoomG = document.getElementById('zoomGroup');

function updateTransform() { zoomG.setAttribute('transform', `translate(${panX}, ${panY}) scale(${scale})`); }
function resetZoom() { panX = document.getElementById('treeContainer').clientWidth / 2; panY = 60; scale = 1; updateTransform(); }

svg.addEventListener('mousedown', e => { dragging = true; startX = e.clientX - panX; startY = e.clientY - panY; });
window.addEventListener('mousemove', e => { if (dragging) { panX = e.clientX - startX; panY = e.clientY - startY; updateTransform(); } });
window.addEventListener('mouseup', () => dragging = false);
svg.addEventListener('wheel', e => {
    e.preventDefault();
    scale = Math.max(0.2, Math.min(5, scale * (e.deltaY < 0 ? 1.1 : 0.9)));
    updateTransform();
}, { passive: false });

// Controlador Principal
function processExpression() {
    const errorBox = document.getElementById('errorBox');
    errorBox.style.display = 'none';
    const raw = document.getElementById('expressionInput').value.trim();
    const type = document.getElementById('notationSelect').value;

    if (!raw) { errorBox.textContent = "Ingresa una expresión."; errorBox.style.display = 'block'; return; }

    try {
        let tokens = tokenize(raw);
        let infix, prefix, postfix, root;

        if (type === 'infix') {
            infix = tokens;
            postfix = infixToPostfix(infix);
            prefix = infixToPrefix(infix);
            root = buildTree(postfix, 'postfix');
        } else if (type === 'postfix') {
            postfix = tokens;
            infix = postfixToInfix(postfix);
            prefix = infixToPrefix(infix);
            root = buildTree(postfix, 'postfix');
        } else if (type === 'prefix') {
            prefix = tokens;
            infix = prefixToInfix(prefix);
            postfix = infixToPostfix(infix);
            root = buildTree(prefix, 'prefix');
        }

        document.getElementById('resInfix').textContent = infix.join(' ');
        document.getElementById('resPrefix').textContent = prefix.join(' ');
        document.getElementById('resPostfix').textContent = postfix.join(' ');

        layoutTree(root);
        renderTree(root);
    } catch (err) {
        errorBox.textContent = "Error: " + err.message;
        errorBox.style.display = 'block';
        ['resInfix', 'resPrefix', 'resPostfix'].forEach(id => document.getElementById(id).textContent = '-');
        document.getElementById('edgesGroup').innerHTML = '';
        document.getElementById('nodesGroup').innerHTML = '';
    }
}

function clearAll() {
    document.getElementById('errorBox').style.display = 'none';
    document.getElementById('expressionInput').value = '';
    document.getElementById('notationSelect').selectedIndex = 0;
    ['resInfix', 'resPrefix', 'resPostfix'].forEach(id => document.getElementById(id).textContent = '-');
    document.getElementById('edgesGroup').innerHTML = '';
    document.getElementById('nodesGroup').innerHTML = '';
    document.getElementById('expressionInput').focus();
}

document.getElementById('processBtn').addEventListener('click', processExpression);
document.getElementById('clearBtn').addEventListener('click', clearAll);
document.getElementById('expressionInput').addEventListener('keypress', e => { if (e.key === 'Enter') processExpression(); });
window.addEventListener('load', clearAll);