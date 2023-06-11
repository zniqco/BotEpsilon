module.exports = {
    delay: async (amount) => {
        return new Promise((resolve) => setTimeout(resolve, amount))
    },
    randomString: (length, characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
        let text = '';
    
        for (let i = 0; i < length; ++i)
            text += characters.charAt(Math.floor(Math.random() * characters.length));
    
        return text;
    }
};
