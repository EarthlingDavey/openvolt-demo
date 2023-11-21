const apiBase = 'https://api.openvolt.com/v1';
const options = {
  headers: {
    accept: 'application/json',
    'x-api-key': process.env.API_KEY,
  },
};

export type GetIntervalParams = {
  meter_id: string;
  start_date: string;
  end_date: string;
  granularity?: 'year' | 'hh';
};

export const getInterval = async (params: GetIntervalParams) => {
  // Make a request to the API
  const response = await fetch(
    `${apiBase}/interval-data?${new URLSearchParams(params).toString()}`,
    options
  );
  const body = await response.json();

  return body;
};
