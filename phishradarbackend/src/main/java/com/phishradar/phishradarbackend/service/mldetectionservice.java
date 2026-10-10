
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

    private Classifier model;
    private Instances structure;

    public mldetectionservice() {
        try (InputStream input =
                     getClass().getResourceAsStream(
                             "/models/phishing.model")) {

            if (input == null) {
                throw new IllegalStateException(
                        "Trained model not found at /models/phishing.model"
                );
            }

            Object[] loaded = SerializationHelper.readAll(input);

            model = (Classifier) loaded[0];
            structure = (Instances) loaded[1];

            structure.setClassIndex(
                    structure.numAttributes() - 1
            );

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Could not load the Weka phishing model", e
            );
        }
    }

    public Prediction predict(String url) throws Exception {

        double[] features = urlfeatureextractor.extract(url);

        if (features.length != structure.numAttributes() - 1) {
            throw new IllegalStateException(
                    "URL feature count does not match model schema"
            );
        }

        Instance instance =
                new DenseInstance(structure.numAttributes());

        instance.setDataset(structure);

        for (int i = 0; i < features.length; i++) {
            instance.setValue(i, features[i]);
        }

        instance.setMissing(structure.classIndex());

        double predictedIndex =
                model.classifyInstance(instance);

        double[] probabilities =
                model.distributionForInstance(instance);

        String classification = structure.classAttribute()
                .value((int) predictedIndex);

        double phishingProbability = 0.0;

        for (int i = 0;
             i < structure.classAttribute().numValues(); i++) {

            if ("phishing".equalsIgnoreCase(
                    structure.classAttribute().value(i))) {

                phishingProbability = probabilities[i];
                break;
            }
        }

        return new Prediction(
                classification,
                phishingProbability * 100
        );
    }

    public record Prediction(
            String classification,
            double phishingProbability
    ) {}
}
