export function parsePageSpeed(data,strategy,fallbackUrl) {
  const lh=data?.lighthouseResult;
  if(!lh||lh.runtimeError)throw new Error('Google could not complete this Lighthouse run. No scores are available.');
  return {strategy,url:lh.finalDisplayedUrl||lh.finalUrl||fallbackUrl,time:lh.fetchTime,version:lh.lighthouseVersion,
    scores:['performance','accessibility','best-practices','seo'].map(key=>{
      const n=lh.categories?.[key]?.score;
      return {name:lh.categories?.[key]?.title||key,value:typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1?Math.round(n*100):null};
    }),
    metrics:['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index']
      .filter(key=>lh.audits?.[key]?.displayValue).map(key=>({name:lh.audits[key].title,value:lh.audits[key].displayValue}))};
}
