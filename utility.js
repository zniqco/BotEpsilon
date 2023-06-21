module.exports = {
    delay: async function (amount) {
        return new Promise((resolve) => setTimeout(resolve, amount))
    },
    randomString: function (length, characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
        let text = '';
    
        for (let i = 0; i < length; ++i)
            text += characters.charAt(Math.floor(Math.random() * characters.length));
    
        return text;
    },
    parseCookie: function parseCookie (string) {
        return string.split(';')
            .map(v => v.split('='))
            .reduce((a, v) => {
                if (v && v.length >= 2)
                    a[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());

                return a;
            }, {});
    }
};
