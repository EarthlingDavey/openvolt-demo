import * as nationalGrid from './nationalGrid';
import * as openVolt from './openVolt';
import type { GetIntervalParams } from './openVolt';

type Answer = number | { fuel: string; perc: number }[];
type Challenge = { question: string; answer?: Answer };

const main = async () => {
  // Define some constants.
  const meterId = '6514167223e3d1424bf82742';
  const from = new Date('2023-01-01T00:00:00Z');
  const to = new Date('2023-02-01T00:00:00Z');
  // Write the params like this for read-ability.
  // These will be transformed to a query string later.
  const baseParams: GetIntervalParams = {
    meter_id: meterId,
    start_date: from.toISOString().split('T')[0],
    end_date: to.toISOString().split('T')[0],
  };
  // An object to contain questions & answers, for logging later.
  const challenges: Challenge[] = [
    {
      question: '1. The monthly energy consumed by the building (kWh)',
      answer: undefined,
    },
    {
      question:
        '2. The monthly amount of CO2 (kgs) emitted by the electricity generated for the building',
      answer: undefined,
    },
    {
      question:
        '3. The monthly % of fuel mix (wind/solar/nuclear/coal/etc) used to generate the electricity.',
      answer: undefined,
    },
  ];

  /**
   * 1. The monthly energy consumed by the building (kWh)
   */
  try {
    const { data } = await openVolt.getInterval({
      ...baseParams,
      granularity: 'year',
    });

    // Maybe we need some validation incase the default unit changes?
    const isKWh = data[0].consumption_units === 'kWh';
    if (!isKWh) {
      throw Error('Unexpected consumption_units from interval-data response');
    }

    // Let's use the units in the variable to avoid potential confusion.
    const janKWhString = data[0].consumption;
    const janKWh = parseInt(janKWhString);
    if ('string' !== typeof janKWhString || isNaN(janKWh)) {
      throw Error('Could not parse consumption from interval-data response');
    }

    // Push the result to the challenges object - for logging later.
    challenges[0].answer = janKWh;
  } catch (err) {
    console.error(err);
  }

  /**
   * 2. The monthly amount of CO2 (kgs) emitted by the electricity generated for the building.
   *    Use half hourly readings from data sources to calculate this
   * 3. The monthly % of fuel mix (wind/solar/nuclear/coal/etc) used to generate the electricity.
   *    Again, use half hourly readings to calculate weighted average
   */

  try {
    // Get openVolt data
    const { data: openVoltData } = await openVolt.getInterval({
      ...baseParams,
      granularity: 'hh',
    });

    // Get national grid data
    const {
      data: { data: nationalGridData },
    } = await nationalGrid.getRegional({ to, from });

    // Set some initial values.
    let janCo2Kg = 0;
    let janFuelMix: { [key: string]: number } = {};

    // Loop over each half-hour interval
    for (let i = 0; i < openVoltData.length; i++) {
      // 2. Add to the janCo2Kg variable here.
      janCo2Kg +=
        parseInt(openVoltData[i].consumption) *
        (nationalGridData[i].intensity.forecast / 1000);

      // 3. Update the janFuelMix variable here.
      for (const { fuel, perc } of nationalGridData[i].generationmix) {
        if (undefined === janFuelMix[fuel]) janFuelMix[fuel] = 0;
        janFuelMix[fuel] += perc / openVoltData.length;
      }
    }

    challenges[1].answer = Math.round(janCo2Kg);
    // Reformat and trim to 2 dp.
    challenges[2].answer = Object.entries(janFuelMix).map(([fuel, perc]) => {
      return { fuel, perc: Math.round(perc * 100) / 100 };
    });
  } catch (err) {
    console.error(err);
  }

  console.log(...challenges);
};

main();
