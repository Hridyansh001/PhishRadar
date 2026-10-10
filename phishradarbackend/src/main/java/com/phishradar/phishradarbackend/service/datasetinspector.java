
package com.phishradar.phishradarbackend.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class datasetinspector {

    public static void main(String[] args) throws Exception {

        String resourcePath =
                "/dataset/PhiUSIIL_Phishing_URL_Dataset.csv";

        try (InputStream input =
                     datasetinspector.class.getResourceAsStream(resourcePath)) {

            if (input == null) {
                throw new IllegalStateException(
                        "Dataset not found: " + resourcePath);
            }

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(input, StandardCharsets.UTF_8));
                 CSVParser parser = CSVFormat.DEFAULT.builder()
                         .setHeader()
                         .setSkipHeaderRecord(true)
                         .setIgnoreEmptyLines(true)
                         .get()
                         .parse(reader)) {

                int expectedColumns = parser.getHeaderNames().size();

                System.out.println("===== DATASET INFO =====");
                System.out.println("Expected columns: " + expectedColumns);
                System.out.println("Column names: " + parser.getHeaderNames());

                Map<String, Long> labelCounts = new HashMap<>();
                long totalRows = 0;
                long invalidRows = 0;

                for (CSVRecord record : parser) {
                    totalRows++;

                    if (record.size() != expectedColumns) {
                        invalidRows++;

                        if (invalidRows <= 10) {
                            System.out.println(
                                    "Column mismatch at record "
                                            + record.getRecordNumber()
                                            + ": found " + record.size()
                                            + " fields");
                        }
                        continue;
                    }

                    String label = record.get("label").trim();
                    labelCounts.merge(label, 1L, Long::sum);

                    if (totalRows <= 3) {
                        System.out.println("\n===== SAMPLE "
                                + totalRows + " =====");
                        print(record, "URL");
                        print(record, "URLLength");
                        print(record, "DomainLength");
                        print(record, "IsDomainIP");
                        print(record, "NoOfSubDomain");
                        print(record, "HasObfuscation");
                        print(record, "NoOfObfuscatedChar");
                        print(record, "NoOfLettersInURL");
                        print(record, "NoOfDegitsInURL");
                        print(record, "NoOfEqualsInURL");
                        print(record, "IsHTTPS");
                        print(record, "label");
                    }
                }

                System.out.println("\n===== SUMMARY =====");
                System.out.println("Rows read: " + totalRows);
                System.out.println("Label counts: " + labelCounts);
                System.out.println("Rows with column mismatch: "
                        + invalidRows);
            }
        }
    }

    private static void print(CSVRecord record, String column) {
        System.out.println(column + ": " + record.get(column));
    }
}
