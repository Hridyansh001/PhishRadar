package com.phishradar.phishradarbackend.service;

import org.springframework.stereotype.Service;
import weka.classifiers.Classifier;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;
import weka.core.SerializationHelper;

import java.io.InputStream;

@Service
public class mldetectionservice {

    private final Classifier model;
    private final Instances structure;

    public mldetectionservice() {
        try (InputStream input =
                     getClass().getResourceAsStream(
                             "/models/phishing.model")) {

            if (input == null) {
                throw new IllegalStateException(
                        "Model not found: /models/phishing.model");
            }

            Object[] loaded = SerializationHelper.readAll(input);

            model = (Classifier) loaded[0];
            structure = (Instances) loaded[1];
            structure.setClassIndex(structure.numAttributes() - 1);

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Could not load the trained phishing model", e);
        }
    }

    public Prediction predict(String url) throws Exception {
        double[] features = urlfeatureextractor.extract(url);

        if (features.length != structure.numAttributes() - 1) {
            throw new IllegalArgumentException(
                    "Expected " + (structure.numAttributes() - 1)
                            + " features, but received " + features.length);
        }

        Instance instance = new DenseInstance(
                structure.numAttributes());

        instance.setDataset(structure);

        for (int i = 0; i < features.length; i++) {
            instance.setValue(i, features[i]);
        }

        instance.setMissing(structure.classIndex());

        double predictedIndex = model.classifyInstance(instance);
        double[] probabilities = model.distributionForInstance(instance);

        String rawClassification = structure.classAttribute()
                .value((int) predictedIndex);
        String classification = rawClassification != null ? rawClassification.toUpperCase() : "LEGITIMATE";

        double phishingProbability = 0.0;

        for (int i = 0; i < structure.classAttribute().numValues(); i++) {
            if ("phishing".equalsIgnoreCase(
                    structure.classAttribute().value(i))) {
                if (probabilities != null && probabilities.length > i) {
                    phishingProbability = probabilities[i] * 100.0;
                }
                break;
            }
        }

        // Clamp to valid percentage range [0.0, 100.0] and format to 2 decimal places
        phishingProbability = Math.max(0.0, Math.min(100.0, phishingProbability));
        phishingProbability = Math.round(phishingProbability * 100.0) / 100.0;

        return new Prediction(
                classification,
                phishingProbability);
    }

    public record Prediction(
            String classification,
            double phishingProbability) {
    }
}
