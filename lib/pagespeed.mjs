// Navigate to Google's own report; PINSEO does not request or invent speed scores.
export function pageSpeedUrl(page) {
  const target=new URL(page);
  if(target.protocol!=='https:'||target.username||target.password)throw new Error('Use a public HTTPS page.');
  target.hash='';
  const destination=new URL('https://pagespeed.web.dev/analysis');
  destination.searchParams.set('url',target.href);
  return destination.href;
}
