function Vertex(word) {
    this.word = word;
    this.adjacent = new Set();
}

function WordGraph(validWords, ops) {
    this.validWords = validWords;
    this.ops = ops;
    this.map = new Map();
};

function WordTrace(graph, startWord, endWord, ops) {
    this.graph = graph;
    this.startWord = startWord;
    this.endWord = endWord;
    this.ops = ops;
    this.parents = new Map();
}

async function loadWords(filename) {
    const res = await fetch(filename);
    const text = await res.text();
    return new Set(text.split("\n"));
}

function getAdjacent(word, g) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const adjacent = new Set();

    for (let ichar = 0; ichar < word.length; ichar++) {
        if (g.ops[2]) {
            const rmAdjacent = word.slice(0, ichar) + word.slice(ichar + 1);
            adjacent.add(rmAdjacent);
        }
        if (g.ops[0]) {
            for (const letter of alphabet) {
                const setAdjacent = word.slice(0, ichar) + letter + word.slice(ichar + 1);
                adjacent.add(setAdjacent);
            }
        }
    }
    if (g.ops[1]) {
        for (let ipos = 0; ipos < word.length + 1; ipos++) {
            for (const letter of alphabet) {
                const addAdjacent = word.slice(0, ipos) + letter + word.slice(ipos);
                adjacent.add(addAdjacent);
            }
        }
    }

    const validAdjacent = new Set();
    for (const adj of adjacent) {
        if (g.validWords.has(adj)) {
            validAdjacent.add(g.map.get(adj));
        }
    }
    validAdjacent.delete(g.map.get(word));
    return validAdjacent;
}

function BFS(t) {
    const queue = [];
    const visited = new Set();

    const start = t.graph.map.get(t.startWord);
    queue.push(start);
    visited.add(start);

    if (t.startWord == t.endWord) {
        return 0;
    }

    while (true) {
        const current = queue.shift();
        if (current == undefined) {
            return 1;
        }

        for (const adj of current.adjacent) {
            if (visited.has(adj)) {
                continue;
            }

            if (adj.word == t.endWord) {
                t.parents.set(adj, current);
                return 0;
            }

            t.parents.set(adj, current);
            queue.push(adj);
            visited.add(adj);
        }
    }

}

async function main() {
    const filename = "wordsets/words-58k.txt";
    const validWords = await loadWords(filename);

    let g = new WordGraph(validWords, null);

    const submit = document.getElementById("submit");
    submit.addEventListener("click", async function () {
        g = await submitClick(g);
    }
    );
}

async function logResult(result, t) {
    const goal = document.getElementById("goal");
    const status = document.getElementById("status");
    const outputbox = document.getElementById("outputbox");

    switch (result) {
        case 0:
            status.innerText = "\u{2705}";
            goal.style.color = "green";
            break;
        case 1:
            status.innerText = "\u{274C}";
            goal.style.color = "red";
            outputbox.hidden = false;
            return;
        case 2:
            status.innerText = "\u{26A0} Word 1"
            goal.style.color = "orange";
            outputbox.hidden = false;
            return;
        case 3:
            status.innerText = "\u{26A0} Word 2"
            goal.style.color = "orange";
            outputbox.hidden = false;
            return;
        case 4:
            status.innerText = "\u{26A0}"
            goal.style.color = "orange";
            outputbox.hidden = false;
            return;
    }

    // if (t == null) {
    //     return;
    // }

    const trace = [];
    let current = t.graph.map.get(t.endWord);
    while (current != null) {
        trace.push(current.word);
        current = t.parents.get(current);
    }
    const nSteps = trace.length;
    const distance = nSteps - 1;
    
    goal.innerText += ` (${distance})`;

    console.log(nSteps);

    const tracebox = document.getElementById("trace");

    for (let i = 0; i < nSteps; i++) {
        const step = document.createElement("div");
        step.className = "step";
        const word = trace.pop()
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await response.json();

        if (data.title == "No Definitions Found") {
            step.setAttribute("title", "No definition found.")
        } else {
            const partOfSpeech = data[0].meanings[0].partOfSpeech;
            const definition = data[0].meanings[0].definitions[0].definition;
            step.setAttribute("title", partOfSpeech + "\n" + definition);
        }

        step.innerHTML = word;
        tracebox.appendChild(step);
    }

    outputbox.hidden = false;
}


async function submitClick(g) {
    const startWord = document.getElementById("start").value.toLowerCase();
    const endWord = document.getElementById("end").value.toLowerCase();
    
    const outputbox = document.getElementById("outputbox");
    outputbox.hidden = false;
    const tracebox = document.getElementById("trace");
    tracebox.innerHTML = "";

    const goal = document.getElementById("goal");
    goal.innerText = `${startWord} \u2192 ${endWord}`;


    // Check for new operations
    const newops = [false, false, false];
    if (document.getElementById("set").checked) {
        newops[0] = true;
    }
    if (document.getElementById("add").checked) {
        newops[1] = true;
    }
    if (document.getElementById("remove").checked) {
        newops[2] = true;
    }

    let needsRebuild = false;
    // If nothing in map, or operations have changed
    if (g.map.size == 0 || g.ops.toString() != newops.toString()) {
        needsRebuild = true;
        g.ops = newops;
    }

    if (!g.validWords.has(startWord)) {
        logResult(2, null);
        return g;
    }
    if (!g.validWords.has(endWord)) {
        logResult(3, null);
        return g;
    }


    startLen = startWord.length;
    endLen = endWord.length;


    // reverse this with demorgans laws
    if (!((startWord == endWord) ||
        ((startLen == endLen) && (g.ops[0] || (g.ops[1] && g.ops[2]))) ||
        ((startLen < endLen) && g.ops[1]) ||
        ((startLen > endLen) && g.ops[2]))) {
        logResult(4, null);
        return g;
    }

    outputbox.hidden = true;
    if (needsRebuild) {
        const overlay = document.getElementById("overlay");
        overlay.hidden = false;
        g = await buildGraph(g.validWords, g.ops);
        overlay.hidden = true;
    }

    const t = new WordTrace(g, startWord, endWord, g.ops);
    logResult(BFS(t), t);

    return g;
}

async function buildGraph(validWords, ops) {



    const g = new WordGraph(validWords, ops);


    for (const word of validWords) {
        const v = new Vertex(word);
        g.map.set(word, v);
    }

    return await run(g);
}




async function run(g) {
    const progressBar = document.getElementById("progressbar");

    let i = 0;
    let f = g.map.size;
    let marker = Math.floor(f / 100);
    let j = 0;

    for (const v of g.map.values()) {
        v.adjacent = getAdjacent(v.word, g);

        if (i % marker == 0) {
            progressBar.style.width = j + "%";
            j++;
            // force style attribute to update
            await new Promise(r => setTimeout(r, 1));
        }
        i++;
    }

    return g;
}



main();
