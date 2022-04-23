var mitmproxy = require('node-mitmproxy');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const os = require('os');
const { suspend, resume } = require('ntsuspend');
let fs=require("fs")
let win = require('easywin')
const open = require('open');
function getBody(re) {
    return new Promise((resolve, reject) => {
        re.setEncoding('utf8');
        let body = [];
        re.on('data', chunk => {
            // console.log(chunk)
            body.push(chunk)
        });
        re.on('end', () => resolve(body.join('')));
    });
}
var dialog = require('dialog-node');

function getHM2Pid(){
    let tree=win.process._processTree()
    for(let pid in tree){
        if(tree[pid].ExeFile.toLowerCase().includes("hitman2.exe")){
            // console.log(tree[pid])
            return tree[pid].Id
        }
    }
    return -1
}
function hideHitmanWindow() {
    let hHitman = win.winuser.FindWindowA("", "HITMAN 2");
    win.winuser.ShowWindow(hHitman, 0);
    suspend(getHM2Pid())
}

function showHitmanWindow() {
    let hHitman = win.winuser.FindWindowA("", "HITMAN 2");
    resume(getHM2Pid())
    win.winuser.ShowWindow(hHitman, 3);
}

showHitmanWindow()
let latestContractId;
mitmproxy.createProxy({
    sslConnectInterceptor: (req, cltSocket, head) => true,
    async requestInterceptor(rOptions, req, res, ssl, next) {
        delete rOptions.headers['accept-encoding'];
        let url = `${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${rOptions.path}`;
        if (rOptions.hostname != "127.0.0.1")
            console.log(`> ${url}`);
        if (req.url.includes("/authentication/api/userchannel/ContractsService/CreateFromParams")) {
            let body = JSON.parse(await getBody(req));
            if(body.creationData.ContractId==latestContractId){
                res.end("{}");
                next();
                return;
            }
            latestContractId=body.creationData.ContractId;
            hideHitmanWindow()
            fs.writeFileSync(os.tmpdir()+"\\.tmp.contract.json", JSON.stringify(body, null, 2))
            await open.openApp("notepad",{arguments:[os.tmpdir()+"\\.tmp.contract.json"],wait:true})
            body=JSON.parse(fs.readFileSync(os.tmpdir()+"\\.tmp.contract.json")+"")
            console.log(body);
            let result = await (await fetch(url,{
                headers:rOptions.headers,
                method:"POST",
                body:JSON.stringify(body)
            })).json();

            console.log(result);
            res.end(JSON.stringify(result));
            showHitmanWindow()
        }
        // console.log('cookie:', rOptions.headers.cookie);
        // res.end('Hello node-mitmproxy!');
        next();
    },
    async responseInterceptor(req, res, proxyReq, proxyRes, ssl, next) {

        if (req.url.includes("127.0.0.1")) {
            next()
            return;
        }
        console.log(`  < ${req.url}`)

        if (req.url == "/authentication/api/userchannel/ContractsService/GetForPlay2") {
            hideHitmanWindow()
            dialog.question("要修改游玩JSON为契约创建JSON吗?", '注入契约创建', 0, async (_, v) => {
                if (v == "OK") {
                    let pres = await getBody(proxyRes)
                    require("fs").writeFileSync("latestGet4Play.json", pres)
                    let parsed = JSON.parse(pres)
                    let source = JSON.parse(require("fs").readFileSync("source.json") + "")
                    let patches = JSON.parse(require("fs").readFileSync("patched.json") + "")
                    let log = ""
                    for (let p of patches) {
                        try {
                            eval(`source.${p}=parsed.${p};`)
                            log += `\t- 已修改：\n\t\t${p} -> \n\t\t${eval(`parsed.${p}`)}\n`
                        } catch (e) {
                            log += `\t- !!! 修改失败：\n\t\t${p} -> \n\t\t${eval(`parsed.${p}`)}\n\t\t  |__${e.toString()}\n`
                        }
                    }

                    res.end(JSON.stringify(source))
                    dialog.info("- 修改请求 GetForPlay2\n\n" + log, "修改完成");

                }

                next()
                showHitmanWindow()
            });
        } else if (req.url.startsWith("/profiles/page/hitscategory")) {
            hideHitmanWindow()
            dialog.question("要修改ET为全ET可用吗?", '注入ET', 0, async (_, v) => {
                if (v == "OK") {
                    let pres = await getBody(proxyRes)
                    let parsed = JSON.parse(pres)
                    let log = ""
                    for (let hit of parsed.data.Data.Hits) {
                        hit.UserCentricContract.Contract.Metadata.Type = "creation"
                        hit.UserCentricContract.Contract.Metadata.PlayableUntil = "2077-01-30T12:00:00Z"
                        log += `\t- 已修改：\n\t\tUserCentricContract.Contract.Metadata.PlayableUntil -> \n\t\t2077-01-30T12:00:00Z\n`
                        delete hit.UserCentricContract.Data.ElusiveContractState
                        log += `\t- 已修改：\n\t\tUserCentricContract.Data.ElusiveContractState -> \n\t\tavailable\n`
                    }
                    // let source = JSON.parse(require("fs").readFileSync("source.json") + "")
                    // let patches = JSON.parse(require("fs").readFileSync("patched.json") + "")
                    // 
                    // for (let p of patches) {
                    // log += `\t- 已修改：\n\t\t${p} -> \n\t\t${eval(`parsed.${p}`)}\n`
                    // eval(`source.${p}=parsed.${p};`)
                    // }
                    res.end(JSON.stringify(parsed))
                    dialog.info("- 修改请求 hitscategory\n\n" + log, "修改完成");
                }
                next()
                showHitmanWindow()
            });
        } else if (req.url.startsWith("/profiles/page/contractcreation/planning")) {
            hideHitmanWindow()
            dialog.question("要修改ET为全ET可用吗?", '注入ET', 0, async (_, v) => {
                if (v == "OK") {
                    let pres = await getBody(proxyRes)
                    let parsed = JSON.parse(pres)
                    let log = ""
                    parsed.data.Contract.Metadata.Type = "creation"
                    parsed.data.Contract.Metadata.PlayableUntil = "2077-01-30T12:00:00Z"
                    log += `\t- 已修改：\n\t\tontract.Metadata.PlayableUntil -> \n\t\t2077-01-30T12:00:00Z\n`
                    delete parsed.data.ElusiveContractState
                    log += `\t- 已修改：\n\t\tElusiveContractState -> \n\t\tavailable\n`
                    res.end(JSON.stringify(parsed))
                    dialog.info("- 修改请求 /profiles/page/Planning\n\n" + log, "修改完成");
                }
                next()
                showHitmanWindow()
            });
        } else if (req.url.startsWith("/authentication/api/userchannel/ContractsService/CreateFromParams")) {
            let pres = await getBody(proxyRes)
            res.end(pres)
            console.log(pres)
        } else next()
    }, port: 3000
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});