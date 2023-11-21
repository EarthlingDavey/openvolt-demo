const apiBase = 'https://api.carbonintensity.org.uk';
const londonRegionId = 13;
const options = {
  headers: { accept: 'application/json' },
};

export const getRegional = async ({ from, to }: { from: Date; to: Date }) => {
  // Use slice to reduce the precision
  const fromString = from.toISOString().slice(0, 16) + 'Z';
  const toString = to.toISOString().slice(0, 16) + 'Z';

  // Make a request to the API
  const response = await fetch(
    `${apiBase}/regional/intensity/${fromString}/${toString}/regionid/${londonRegionId}`,
    options
  );
  const body = await response.json();

  return body;
};
