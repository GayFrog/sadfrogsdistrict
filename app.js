const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');
const { ethers } = require('ethers');
const tweet = require('./tweet');

const alreadyTweeted = [];

function formatAndSendTweet(event) {
    const tokenName = _.get(event, ['asset', 'name']);
    const image = _.get(event, ['asset', 'image_url']);
    const openseaLink = _.get(event, ['asset', 'permalink']);
    const totalPrice = _.get(event, 'total_price');
    const usdValue = _.get(event, ['payment_token', 'usd_price']);
    const tokenSymbol = _.get(event, ['payment_token', 'symbol']);

    const formattedTokenPrice = (totalPrice / 1e18).toFixed(2);
    const formattedUsdPrice = (formattedTokenPrice * usdValue).toFixed(2);
    const formattedPriceSymbol = (
        (tokenSymbol === 'WETH' || tokenSymbol === 'ETH') 
            ? 'Ξ' 
            : ` ${tokenSymbol}`
    );

    const buyer = event.winner_account.user.username;
    if (typeof(buyer) == 'undefined' || buyer == '') {
      buyer = event.winner_account.address.substring(0,8);
    }
    const seller = event.seller.user.username;
    if (typeof(seller) == 'undefined' || seller == '') {
      seller = event.seller.address.substring(0,8);
    }

    const tweetText = `${tokenName} bought for ${formattedTokenPrice}${formattedPriceSymbol} by ${buyer} from ${seller}. ($${formattedUsdPrice}) #NFTs ${openseaLink}`;

    console.log(tweetText);

    /*
    if ((event.total_price / 1e18) < 1) {
      console.log('Sale is only ' + event.total_price/1e18 + ' ETH, returning...')
      return;
    }
    */

    let tx = event.transaction.transaction_hash;

    if (alreadyTweeted.includes(tx)) {
      console.log('Already tweeted!');
      return;
    } else {
      alreadyTweeted.push(tx);
    }

    return tweet.tweet(tweetText, image);
}

// Poll OpenSea every minute & retrieve all sales for a given collection in the last minute
// Then pass those events over to the formatter before tweeting
setInterval(() => {
    const lastMinute = moment().startOf('minute').subtract(300, "seconds").unix();

    axios.get('https://api.opensea.io/api/v1/events', {
        params: {
            collection_slug: process.env.OPENSEA_COLLECTION_SLUG,
            event_type: 'successful',
            occurred_after: lastMinute,
            only_opensea: 'false'
        }
    }).then((response) => {
        const events = _.get(response, ['data', 'asset_events']);

        console.log(`${events.length} sales in the last minute...`);

        _.each(events, (event) => {
            return formatAndSendTweet(event);
        });
    }).catch((error) => {
        console.error(error);
    });
}, 60000);
