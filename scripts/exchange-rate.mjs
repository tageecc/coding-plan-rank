import {parseHTML} from 'linkedom';
import {requireFact} from './parsers.mjs';

export const EXCHANGE_SOURCE='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

export function parseExchangeRate(raw, now=new Date().toISOString()) {
  const {document}=parseHTML(raw);
  const dates=[...document.querySelectorAll('[time]')];
  requireFact(dates.length===1 && /^\d{4}-\d{2}-\d{2}$/.test(dates[0].getAttribute('time')),'ECB rate date missing or ambiguous');
  const rateDate=dates[0].getAttribute('time');
  const age=Date.parse(now)-Date.parse(`${rateDate}T00:00:00Z`);
  requireFact(Number.isFinite(age) && age>=0 && age<=7*86400000,'ECB rate date is future or stale');
  const rate=currency=> {
    const rows=dates[0].querySelectorAll(`[currency="${currency}"]`);
    requireFact(rows.length===1,'ECB currency rate missing or ambiguous');
    const value=Number(rows[0].getAttribute('rate'));
    requireFact(Number.isFinite(value) && value>0,'ECB invalid reference rate');
    return value;
  };
  // ECB quotes both currencies against EUR, so divide CNY/EUR by USD/EUR.
  const referenceRates={USD:rate('USD'),CNY:rate('CNY')};
  const usdToCny=Number((referenceRates.CNY/referenceRates.USD).toFixed(6));
  requireFact(usdToCny>1 && usdToCny<20,'ECB USD/CNY rate requires review');
  return {base:'USD',quote:'CNY',rate:usdToCny,rateDate,checkedAt:now,referenceRates,status:'ok',source:EXCHANGE_SOURCE};
}

export async function updateExchangeRate(load, previous, now) {
  try{return parseExchangeRate(await load(EXCHANGE_SOURCE),now);}
  catch(error){return {...(previous??{base:'USD',quote:'CNY',rate:null,rateDate:'',checkedAt:'',source:EXCHANGE_SOURCE}),status:'unavailable',error:String(error.message).slice(0,300)};}
}

export function cnyPrice(plan, exchangeRate) {
  const value=plan.currency==='CNY'?plan.monthlyPrice:plan.monthlyUsd;
  if(!Number.isFinite(value))return null;
  if(plan.currency==='CNY' || value===0)return value;
  if(exchangeRate?.status!=='ok' || !Number.isFinite(exchangeRate.rate) || exchangeRate.rate<=0)return null;
  return Math.round((value*exchangeRate.rate+Number.EPSILON)*100)/100;
}

export function cnyMoney(plan, exchangeRate) {
  const value=cnyPrice(plan,exchangeRate);
  return value===null?'汇率待核验':`${plan.currency!=='CNY' && value>0?'≈':''}${new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(value)}元`;
}
