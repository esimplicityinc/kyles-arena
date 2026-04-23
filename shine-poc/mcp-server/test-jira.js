#!/usr/bin/env node

/**
 * Test script for Jira MCP Server
 * Sends JSON-RPC messages via stdin to test the tools
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Spawn the Jira server
const server = spawn('node', [join(__dirname, 'jira-server.js')], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
let serverStarted = false;

// Listen for server startup message on stderr
server.stderr.on('data', (data) => {
  const msg = data.toString();
  console.log('🔧 Server:', msg.trim());
  if (msg.includes('SHINE Jira MCP Server running')) {
    serverStarted = true;
  }
});

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
  console.log('\n🧪 Testing Jira MCP Server\n');
  
  // Test 1: List tools
  console.log('📤 Request: List available tools');
  const listToolsMsg = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  server.stdin.write(JSON.stringify(listToolsMsg) + '\n');
  
  // Wait for response, then test jira_list_projects
  setTimeout(() => {
    console.log('\n📤 Request: jira_list_projects (list accessible projects)');
    const callToolMsg = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'jira_list_projects',
        arguments: {
          maxResults: 10
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
