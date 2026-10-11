
package com.phishradar.phishradarbackend.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import weka.classifiers.Evaluation;
import weka.classifiers.trees.RandomForest;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;
import weka.core.SerializationHelper;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Random;
import java.util.Set;

public class modeltrainingservice {

    private static final String DATASET =
            "/dataset/PhiUSIIL_Phishing_URL_Dataset.csv";

    private static final int FEATURE_COUNT = 10;

    public static void main(String[] args) throws Exception {
        Instances data = loadDataset();

        System.out.println("Valid unique URLs loaded: "
                + data.numInstances());
        System.out.println("Features: "
                + (data.numAttributes() - 1));

        if (data.numInstances() < 100) {
            throw new IllegalStateException(
                    "Not enough valid records to train.");
        }

        // Reproducible shuffle.
        data.randomize(new Random(42));

        int trainSize = (int) Math.round(
                data.numInstances() * 0.80);

        Instances trainingData =
                new Instances(data, 0, trainSize);
        Instances testData =
                new Instances(data, trainSize,
                        data.numInstances() - trainSize);

        RandomForest model = new RandomForest();
        model.setNumIterations(100);
        model.setSeed(42);
        model.buildClassifier(trainingData);

        Evaluation evaluation = new Evaluation(trainingData);
        evaluation.evaluateModel(model, testData);

        System.out.println("\n===== MODEL EVALUATION =====");
        System.out.printf("Accuracy: %.2f%%%n",
                (1.0 - evaluation.errorRate()) * 100);
        System.out.println(evaluation.toClassDetailsString());
        System.out.println(evaluation.toMatrixString());

        Path modelDirectory =
                Path.of("models");
        Files.createDirectories(modelDirectory);

        Path modelFile =
                modelDirectory.resolve("phishing.model");
        Path schemaFile =
                modelDirectory.resolve("phishing-schema.arff");

        SerializationHelper.writeAll(
                modelFile.toString(),
                new Object[] {
                        model,
                        new Instances(data, 0)
                }
        );

        Files.writeString(
                schemaFile,
                new Instances(data, 0).toString(),
                StandardCharsets.UTF_8
        );

        System.out.println("\nModel saved to: "
                + modelFile.toAbsolutePath());
        System.out.println("Schema saved to: "
                + schemaFile.toAbsolutePath());
    }

    private static Instances loadDataset() throws Exception {

        ArrayList<Attribute> attributes = new ArrayList<>();

        // These names and positions must match URLFeatureExtractor.
        String[] featureNames = {
                "URLLength",
                "DomainLength",
                "IsDomainIP",
                "NoOfSubDomain",
                "HasObfuscation",
                "NoOfObfuscatedChar",
                "NoOfLettersInURL",
                "NoOfDegitsInURL",
                "NoOfEqualsInURL",
                "IsHTTPS"
        };

        for (String name : featureNames) {
            attributes.add(new Attribute(name));
        }

        ArrayList<String> classValues = new ArrayList<>();
        classValues.add("phishing");
        classValues.add("legitimate");

        attributes.add(new Attribute("label", classValues));

        Instances data = new Instances(
                "URL_Feature_Dataset", attributes, 1000);
        data.setClassIndex(data.numAttributes() - 1);

        Set<String> seenUrls = new HashSet<>();

        try (InputStream input =
                     modeltrainingservice.class
                             .getResourceAsStream(DATASET)) {

            if (input == null) {
                throw new IllegalStateException(
                        "Dataset not found: " + DATASET);
            }

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(
                            input, StandardCharsets.UTF_8));
                 CSVParser parser = CSVFormat.DEFAULT.builder()
                         .setHeader()
                         .setSkipHeaderRecord(true)
                         .setIgnoreEmptyLines(true)
                         .get()
                         .parse(reader)) {

                for (CSVRecord record : parser) {
                    try {
                        String url = record.get("URL").trim();
                        String label = record.get("label").trim();

                        if (url.isBlank()
                                || (!label.equals("0")
                                && !label.equals("1"))) {
                            continue;
                        }

                        // Avoid exact duplicate URLs.
                        if (!seenUrls.add(url)) {
                            continue;
                        }

                        // Use exactly the same feature extractor
                        // as the live prediction service.
                        double[] features =
                                urlfeatureextractor.extract(url);

                        if (features.length != FEATURE_COUNT) {
                            throw new IllegalStateException(
                                    "Expected 10 features, got "
                                            + features.length);
                        }

                        double[] values =
                                new double[FEATURE_COUNT + 1];

                        System.arraycopy(
                                features, 0,
                                values, 0, FEATURE_COUNT);

                        // Dataset definition: 0 = phishing,
                        // 1 = legitimate.
                        values[FEATURE_COUNT] =
                                label.equals("0") ? 0 : 1;

                        data.add(new DenseInstance(1.0, values));

                    } catch (IllegalArgumentException e) {
                        // Skip malformed URLs or invalid records.
                    }
                }
            }
        }
        return data;
    }
}
