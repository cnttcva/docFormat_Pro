// File: server/ai/providers/providerHttpClient.cjs
//
// HTTP client nội bộ dùng riêng cho các nhà cung cấp AI.
// Không sử dụng hoặc import bất kỳ logic DOCX nào.

const https = require('https');

function toPositiveInteger(value, fallbackValue) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return Math.floor(parsed);
}

// Thời gian chờ mặc định: 20 giây.
const REQUEST_TIMEOUT_MS = toPositiveInteger(
  process.env.AI_PROVIDER_TIMEOUT_MS,
  20 * 1000
);

// Giới hạn phản hồi tối đa: 2 MB.
const MAX_RESPONSE_BYTES = toPositiveInteger(
  process.env.AI_PROVIDER_MAX_RESPONSE_BYTES,
  2 * 1024 * 1024
);

function createClientError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Thực hiện GET HTTPS và đọc phản hồi JSON.
 *
 * Không log URL đầy đủ, header hoặc API Key.
 */
function requestJson({
  hostname,
  path,
  headers = {},
}) {
  return new Promise((resolve, reject) => {
    let settled = false;

    function resolveOnce(value) {
      if (settled) return;

      settled = true;
      resolve(value);
    }

    function rejectOnce(error) {
      if (settled) return;

      settled = true;
      reject(error);
    }

    const request = https.request(
      {
        protocol: 'https:',
        hostname,
        port: 443,
        method: 'GET',
        path,
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          'User-Agent': 'DocFormatPro-AI/1.0',
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        let totalBytes = 0;

        const declaredLength = Number(
          response.headers[
            'content-length'
          ] || 0
        );

        if (
          Number.isFinite(declaredLength) &&
          declaredLength >
            MAX_RESPONSE_BYTES
        ) {
          response.resume();

          rejectOnce(
            createClientError(
              'AI_PROVIDER_RESPONSE_TOO_LARGE',
              'Phản hồi của nhà cung cấp AI vượt quá giới hạn cho phép.'
            )
          );

          return;
        }

        response.on('data', (chunk) => {
          if (settled) return;

          totalBytes += chunk.length;

          if (
            totalBytes >
            MAX_RESPONSE_BYTES
          ) {
            response.destroy();

            rejectOnce(
              createClientError(
                'AI_PROVIDER_RESPONSE_TOO_LARGE',
                'Phản hồi của nhà cung cấp AI vượt quá giới hạn cho phép.'
              )
            );

            return;
          }

          chunks.push(chunk);
        });

        response.on('end', () => {
          if (settled) return;

          const rawBody = Buffer
            .concat(chunks)
            .toString('utf8');

          let body = null;
          let jsonParseFailed = false;

          if (
            rawBody.trim().length > 0
          ) {
            try {
              body = JSON.parse(rawBody);
            } catch (_error) {
              jsonParseFailed = true;
            }
          }

          resolveOnce({
            statusCode: Number(
              response.statusCode || 0
            ),
            headers: response.headers,
            body,
            jsonParseFailed,
          });
        });

        response.on('error', () => {
          rejectOnce(
            createClientError(
              'AI_PROVIDER_NETWORK_ERROR',
              'Không thể đọc phản hồi từ nhà cung cấp AI.'
            )
          );
        });
      }
    );

    request.setTimeout(
      REQUEST_TIMEOUT_MS,
      () => {
        request.destroy(
          createClientError(
            'AI_PROVIDER_TIMEOUT',
            'Nhà cung cấp AI phản hồi quá thời gian cho phép.'
          )
        );
      }
    );

    request.on('error', (error) => {
      if (
        error &&
        error.code ===
          'AI_PROVIDER_TIMEOUT'
      ) {
        rejectOnce(error);
        return;
      }

      rejectOnce(
        createClientError(
          'AI_PROVIDER_NETWORK_ERROR',
          'Không thể kết nối đến nhà cung cấp AI.'
        )
      );
    });

    request.end();
  });
}

module.exports = {
  requestJson,
};