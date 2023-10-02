const md5 = require('md5');
const axios = require('axios').default;
const utility = require('../../utility.js');

module.exports = {
    makeHeader: function (ltoken, ltuid) {
        return {
            'Cookie': `ltoken=${ltoken};ltuid=${ltuid}`
        };
    },
    makeClientHeader: function (ltoken, ltuid) {
        // https://github.com/thesadru/genshinstats/issues/54
        const t = Math.floor(Date.now() / 1000);
        const r = utility.randomString(6);
        const hash = md5(`salt=6s25p5ox5y14umn1p61aqyyvbvvl3lrt&t=${t}&r=${r}`);
        const ds = `${t},${r},${hash}`;
        
        return {
            'x-rpc-client_type': 5,
            'x-rpc-app_version': '1.5.0',
            'x-rpc-language': 'ko-kr',
            'DS': ds,
            'Cookie': `ltoken=${ltoken};ltuid=${ltuid}`
        };
    },
    get: async function (ltoken, ltuid, url) {
        const result = await axios({
            method: 'GET',
            url: url,
            headers: this.makeHeader(ltoken, ltuid),
        });

        return result?.data.retcode === 0 ? result?.data?.data : null;
    },
    post: async function (ltoken, ltuid, url) {
        const result = await axios({
            method: 'POST',
            url: url,
            headers: this.makeHeader(ltoken, ltuid),
        });

        return result?.data.retcode === 0 ? result?.data?.data : null;
    },
    clientGet: async function (ltoken, ltuid, url) {
        const result = await axios({
            method: 'GET',
            url: url,
            headers: this.makeClientHeader(ltoken, ltuid),
        });

        return result?.data.retcode === 0 ? result?.data?.data : null;
    },
    getGameRecordRow: async function (ltoken, ltuid, game_id, region) {
        const result = await this.get(ltoken, ltuid, `https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${ltuid}`);
        const rows = result?.list?.filter(x => x.game_id == game_id && x.region == region);

        return rows ? rows[0] : null;
    }
};
