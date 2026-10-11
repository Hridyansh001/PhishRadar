package com.phishradar.phishradarbackend.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import weka.classifiers.Evaluation;
import weka.classifiers.trees.RandomForest;
import weka.core.*;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Random;

public class modeltrainingservice {
    private static final String DATASET =
            "/dataset/PhiUSIIL_Phishing_URL_Dataset.csv";

    private static final String[] FEATURES = {
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

    public static void main(String[] args) throws Exception {
        Instances data = loadDataset();

        System.out.println("Valid records loaded: " + data.numInstances());
        System.out.println("Features: " + data.numAttributes());

        // Shuffle before splitting.
        data.randomize(new Random(42));

        int trainSize = (int) Math.round(data.numInstances() * 0.80);
        int testSize = data.numInstances() - trainSize;

        Instances trainingData = new Instances(data, 0, trainSize);
        Instances testData = new Instances(data, trainSize, testSize);

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

        Path modelDirectory = Path.of("models");
        Files.createDirectories(modelDirectory);

        Path modelFile = modelDirectory.resolve("phishing.model");
        Path schemaFile = modelDirectory.resolve("phishing-schema.arff");

        // Save the trained classifier and an empty dataset schema.
        SerializationHelper.writeAll(
                modelFile.toString(),
                new Object[] { model, new Instances(data, 0) }
        );

        // Keep a readable copy of the training schema.
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

        for (String feature : FEATURES) {
            attributes.add(new Attribute(feature));
        }

        ArrayList<String> classValues = new ArrayList<>();
        classValues.add("phishing");
        classValues.add("legitimate");
        attributes.add(new Attribute("label", classValues));

        Instances data = new Instances(
                "PhiUSIIL_URL_Dataset", attributes, 1000);
        data.setClassIndex(data.numAttributes() - 1);

        try (InputStream input =
                     modeltrainingservice.class.getResourceAsStream(DATASET)) {

            if (input == null) {
                throw new IllegalStateException(
                        "Dataset not found: " + DATASET);
            }

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(input, StandardCharsets.UTF_8));
                 CSVParser parser = CSVFormat.DEFAULT.builder()
                         .setHeader()
                         .setSkipHeaderRecord(true)
                         .setIgnoreEmptyLines(true)
                         .get()
                         .parse(reader)) {

                for (CSVRecord record : parser) {
                    try {
                        double[] values = new double[FEATURES.length + 1];

                        for (int i = 0; i < FEATURES.length; i++) {
                            values[i] = Double.parseDouble(
                                    record.get(FEATURES[i]).trim());
                        }

                        String label = record.get("label").trim();

                        if ("0".equals(label)) {
                            values[FEATURES.length] = 0;
                        } else if ("1".equals(label)) {
                            values[FEATURES.length] = 1;
                        } else {
                            continue;
                        }

                        data.add(new DenseInstance(1.0, values));
                    } catch (IllegalArgumentException e) {
                        // Skip records with invalid numeric features.
                    }
                }
            }
        }

        if (data.numInstances() < 100) {
            throw new IllegalStateException(
                    "Not enough valid records to train the model");
        }

        return data;
    }
}
