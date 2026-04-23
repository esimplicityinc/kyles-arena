#!/usr/bin/env node

/**
 * Test script for GitHub MCP Server
 * Sends JSON-RPC messages via stdin to test the tools
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Spawn the GitHub server
const server = spawn('node', [join(__dirname, 'github-server.js')], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  // Try to parse complete JSON-RPC responses
  const lines = buffer.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    try {
      const response = JSON.parse(lines[i]);
      console.log('\n📥 Response:');
      console.log(JSON.stringify(response, null, 2));
    } catch {
      // Not valid JSON, might be partial
    }
  }
  buffer = lines[lines.length - 1];
});

// Wait a moment for server to start, then send test messages
setTimeout(async () => {
  console.log('\n🧪 Testing GitHub MCP Server\n');
  
  // Test 1: List tools
  console.log('📤 Request: List available tools');
  const listToolsMsg = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  server.stdin.write(JSON.stringify(listToolsMsg) + '\n');
  
  // Wait for response, then test github_list_repos
  setTimeout(() => {
    console.log('\n📤 Request: github_list_repos (top 5, sorted by updated)');
    const callToolMsg = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'github_list_repos',
        arguments: {
          sortBy: 'updated',
          maxResults: 5
        }
      }
    };
    server.stdin.write(JSON.stringify(callToolMsg) + '\n');
    
    // Give time for response, then exit
    setTimeout(() => {
      console.log('\n✅ Test complete');
      server.kill();
      process.exit(0);
    }, 5000);
  }, 2000);
  
}, 1000);

// Handle errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
