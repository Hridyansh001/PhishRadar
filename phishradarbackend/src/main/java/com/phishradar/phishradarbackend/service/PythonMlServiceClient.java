package com.phishradar.phishradarbackend.service;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PythonMlServiceClient {

    private static final String DEFAULT_SERVICE_URL = "http://localhost:8000/predict";
    private final HttpClient httpClient;

    private static final Pattern PREDICTION_PATTERN = Pattern.compile(
            "\"prediction\"\\s*:\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern PROB_PATTERN = Pattern.compile(
            "\"phishingProbability\"\\s*:\\s*([0-9.]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern CONFIDENCE_PATTERN = Pattern.compile(
            "\"confidence\"\\s*:\\s*([0-9.]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern VERSION_PATTERN = Pattern.compile(
            "\"modelVersion\"\\s*:\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern EXPLANATION_ITEM_PATTERN = Pattern.compile(
            "\"([^\"]+)\"");

    public PythonMlServiceClient() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(800))
                .build();
    }

    public record IntelligentMlPrediction(
            String classification,
            double phishingProbability,
            double confidence,
            List<String> explanations,
            String modelVersion
    ) {}

    public Optional<IntelligentMlPrediction> predict(String url, Map<String, Object> features, Map<String, Object> domFeatures) {
        try {
            String jsonBody = buildJsonPayload(url, features, domFeatures);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(DEFAULT_SERVICE_URL))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofMillis(1200))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                String body = response.body();

                String classification = "LEGITIMATE";
                Matcher mPred = PREDICTION_PATTERN.matcher(body);
                if (mPred.find()) {
                    classification = mPred.group(1).toUpperCase();
                }

                double probability = 0.0;
                Matcher mProb = PROB_PATTERN.matcher(body);
                if (mProb.find()) {
                    probability = Double.parseDouble(mProb.group(1));
                }

                double confidence = 0.5;
                Matcher mConf = CONFIDENCE_PATTERN.matcher(body);
                if (mConf.find()) {
                    confidence = Double.parseDouble(mConf.group(1));
                }

                String modelVersion = "Python-ML-Service";
                Matcher mVer = VERSION_PATTERN.matcher(body);
                if (mVer.find()) {
                    modelVersion = mVer.group(1);
                }

                List<String> explanations = new ArrayList<>();
                int expStart = body.indexOf("\"explanations\"");
                if (expStart != -1) {
                    int arrStart = body.indexOf("[", expStart);
                    int arrEnd = body.indexOf("]", arrStart);
                    if (arrStart != -1 && arrEnd != -1) {
                        String arrayContent = body.substring(arrStart + 1, arrEnd);
                        Matcher mItems = EXPLANATION_ITEM_PATTERN.matcher(arrayContent);
                        while (mItems.find()) {
                            explanations.add(mItems.group(1));
                        }
                    }
                }

                return Optional.of(new IntelligentMlPrediction(
                        classification,
                        probability,
                        confidence,
                        Collections.unmodifiableList(explanations),
                        modelVersion
                ));
            }
        } catch (Exception ignored) {
            // Python ML service is offline or unreachable; falls back to local Weka model
        }
        return Optional.empty();
    }

    private String buildJsonPayload(String url, Map<String, Object> features, Map<String, Object> domFeatures) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"url\":").append(quote(url)).append(",");
        sb.append("\"features\":{");
        if (features != null) {
            boolean first = true;
            for (Map.Entry<String, Object> entry : features.entrySet()) {
                if (!first) sb.append(",");
                sb.append(quote(entry.getKey())).append(":").append(formatValue(entry.getValue()));
                first = false;
            }
        }
        sb.append("},");
        sb.append("\"domFeatures\":{");
        if (domFeatures != null) {
            boolean first = true;
            for (Map.Entry<String, Object> entry : domFeatures.entrySet()) {
                if (!first) sb.append(",");
                sb.append(quote(entry.getKey())).append(":").append(formatValue(entry.getValue()));
                first = false;
            }
        }
        sb.append("}");
        sb.append("}");
        return sb.toString();
    }

    private String quote(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }

    private String formatValue(Object val) {
        if (val == null) return "null";
        if (val instanceof Boolean b) return b ? "true" : "false";
        if (val instanceof Number n) return n.toString();
        return quote(val.toString());
    }
}
