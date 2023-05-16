module.exports = {
    delay: async (amount) => {
        return new Promise((resolve) => setTimeout(resolve, amount))
    },
};
