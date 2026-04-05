/**
 * train-classifier.ts
 * 
 * Standalone script to train the Naive Bayes classifier and persist it to classifier.json.
 * Run: npx tsx app/api/compare/lib/train-classifier.ts
 * 
 * This eliminates the cold-start bottleneck by pre-computing the model.
 */
import natural from 'natural';
import * as fs from 'fs';
import * as path from 'path';
import trainingData from './dataset.json';

const classifier = new natural.BayesClassifier();

// Load training data
trainingData.forEach((data: { text: string; category: string }) => {
  classifier.addDocument(data.text, data.category);
});

// Train the model
classifier.train();

// Persist to JSON file
const outputPath = path.join(__dirname, 'classifier.json');

// Use the classifier's internal serialization
const classifierJSON = JSON.stringify(classifier);
fs.writeFileSync(outputPath, classifierJSON, 'utf-8');

console.log(`✅ Classifier trained and saved to: ${outputPath}`);
console.log(`   Training samples: ${trainingData.length}`);
console.log(`   File size: ${(Buffer.byteLength(classifierJSON) / 1024).toFixed(1)} KB`);
