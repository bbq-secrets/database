require("dotenv/config");

const fetch = require("node-fetch");
const qs = require("qs");
const fs = require("fs");
const axios = require("axios");

const database = require("./database.json");
const { pontos_venda: places } = database;

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const init = (async () => {
  let updated = 0;
  let notFounded = 0;

  const updatedPlaces = await Promise.all(
    places.map(async (place) => {
      if (place.lat && place.lng) {
        return place;
      }

      const placeUrl = encodeURI(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${qs.stringify(
          {
            key: GOOGLE_MAPS_API_KEY,
            input: place.endereco,
          }
        )}`
      );

      const placeResponse = await fetch(placeUrl);
      const placeData = await placeResponse.json();

      const predictions = placeData.predictions;

      if (!predictions.length) {
        try {
          const gpsCoordinatesUrl = `https://api.opencagedata.com/geocode/v1/json?${qs.stringify(
            {
              q: place.endereco,
              key: "641c51bed8ab490184632ad8526e29ad",
              no_annotations: 1,
            }
          )}`;

          const { data: gpsCoordinatesResponse } = await axios.get(
            gpsCoordinatesUrl
          );

          const { results: gpsCoordinatesResults } = gpsCoordinatesResponse;

          if (gpsCoordinatesResults.length) {
            const result = gpsCoordinatesResults.find((el) => el);

            const { geometry: location } = result;

            updated++;

            return {
              ...place,
              ...location,
            };
          }
        } catch (err) {
          notFounded++;

          return place;
        }
      }

      const prediction = predictions.find((el) => el);

      const detailsUrl = encodeURI(
        `https://maps.googleapis.com/maps/api/place/details/json?${qs.stringify(
          {
            key: GOOGLE_MAPS_API_KEY,
            placeid: prediction.place_id,
          }
        )}`
      );

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      const { location } = detailsData.result.geometry;

      updated++;

      return {
        ...place,
        ...location,
      };
    })
  );

  const updatedDatabase = {
    ...database,
    pontos_venda: updatedPlaces,
  };

  fs.writeFile(
    "database.json",
    JSON.stringify(updatedDatabase, null, 2),
    (err) => {
      if (err) {
        console.error("Ops, algo deu errado:", err);
        return;
      }

      console.log("Processo concluído");
      console.log(` > Pontos de venda atualizados: ${updated}`);
      console.log(` > Pontos de venda NÃO atualizados: ${notFounded}`);
    }
  );
})();
