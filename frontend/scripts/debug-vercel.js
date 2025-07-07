#!/usr/bin/env node

/**
 * Debug script for Vercel deployment issues
 * Run with: npm run debug:vercel
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Vercel Deployment Debug');
console.log('========================');

// Check if dist directory exists
const distPath = path.join(process.cwd(), 'dist');
console.log('\n📁 Build Output Check:');
console.log('Dist directory:', distPath);
console.log('Exists:', fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log('Files in dist:');
  files.forEach(file => {
    const filePath = path.join(distPath, file);
    const stats = fs.statSync(filePath);
    console.log(`  ${file} (${stats.isDirectory() ? 'dir' : 'file'})`);
  });
  
  // Check for index.html
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('\n✅ index.html found');
    const content = fs.readFileSync(indexPath, 'utf8');
    console.log('Size:', content.length, 'bytes');
    
    // Check if it contains the root div
    if (content.includes('<div id="root">')) {
      console.log('✅ Root div found');
    } else {
      console.log('❌ Root div missing');
    }
    
    // Check for script tags
    const scriptMatches = content.match(/<script[^>]*>/g);
    if (scriptMatches) {
      console.log('✅ Script tags found:', scriptMatches.length);
    } else {
      console.log('❌ No script tags found');
    }
  } else {
    console.log('❌ index.html not found in dist');
  }
  
  // Check assets directory
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const assetFiles = fs.readdirSync(assetsPath);
    console.log('\n📦 Assets found:', assetFiles.length);
    assetFiles.slice(0, 5).forEach(file => {
      console.log(`  ${file}`);
    });
    if (assetFiles.length > 5) {
      console.log(`  ... and ${assetFiles.length - 5} more`);
    }
  } else {
    console.log('❌ Assets directory not found');
  }
} else {
  console.log('❌ Dist directory not found - run npm run build first');
}

// Check vercel.json
console.log('\n⚙️ Vercel Configuration:');
const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
if (fs.existsSync(vercelConfigPath)) {
  console.log('✅ vercel.json found');
  try {
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    console.log('Output directory:', config.outputDirectory);
    console.log('Build command:', config.buildCommand);
    console.log('Framework:', config.framework);
    
    if (config.rewrites) {
      console.log('Rewrites configured:', config.rewrites.length);
    }
    
    if (config.env) {
      console.log('Environment variables:', Object.keys(config.env).length);
      Object.keys(config.env).forEach(key => {
        console.log(`  ${key}: ${config.env[key]}`);
      });
    }
  } catch (error) {
    console.log('❌ Error parsing vercel.json:', error.message);
  }
} else {
  console.log('❌ vercel.json not found');
}

// Check package.json scripts
console.log('\n📜 Package.json Scripts:');
const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log('Build script:', pkg.scripts?.build);
    console.log('Build:vercel script:', pkg.scripts?.['build:vercel']);
  } catch (error) {
    console.log('❌ Error parsing package.json:', error.message);
  }
}

// Environment variables check
console.log('\n🌍 Environment Variables:');
const envVars = [
  'VITE_API_URL',
  'VITE_ENVIRONMENT',
  'VITE_DEBUG_MODE',
  'NODE_ENV'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}: ${value || 'not set'}`);
});

console.log('\n🔧 Troubleshooting Tips:');
console.log('1. Make sure "npm run build" completes successfully');
console.log('2. Verify dist/index.html exists and contains your app');
console.log('3. Check that vercel.json has correct outputDirectory');
console.log('4. Ensure environment variables are set in Vercel dashboard');
console.log('5. Try deploying with "vercel --prod" for more detailed logs');

console.log('\n✅ Debug completed!');