#!/usr/bin/env node

/**
 * Test script for SHINE Orchestrator MCP Server
 * 
 * Tests:
 * 1. List available tools (should show 3: shine_search, shine_ask, shine_status)
 * 2. Call shine_status to check source availability
 * 3. Call shine_search with "AWS migration" query
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MCP message helpers
let messageId = 0;

function createMessage(method, params = {}) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: ++messageId,
    method,
    params,
  });
}

function parseMessages(buffer) {
  const messages = [];
  const lines = buffer.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      messages.push(JSON.parse(line));
    } catch {
      // Skip non-JSON lines
    }
  }
  
  return messages;
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('SHINE Orchestrator MCP Server - Test Suite');
  console.log('='.repeat(60));
  console.log();

  const orchestratorPath = join(__dirname, 'orchestrator.js');
  
  // Spawn the orchestrator server
  console.log('Starting orchestrator server...');
  const proc = spawn('node', [orchestratorPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  const responses = [];

  proc.stdout.on('data', (data) => {
    stdout += data.toString();
    const msgs = parseMessages(data.toString());
    for (const msg of msgs) {
      if (msg.id) {
        responses.push(msg);
      }
    }
  });

  proc.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check if server started
  if (!stderr.includes('SHINE Orchestrator MCP Server running')) {
    console.log('❌ Server failed to start');
    console.log('STDERR:', stderr);
    proc.kill();
    process.exit(1);
  }
  console.log('✅ Server started successfully');
  console.log();

  // Helper to send message and wait for response
  async function sendAndWait(method, params = {}, timeoutMs = 10000) {
    const msg = createMessage(method, params);
    const currentId = messageId;
    
    proc.stdin.write(msg + '\n');
    
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const response = responses.find(r => r.id === currentId);
      if (response) {
        return response;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for response to ${method}`);
  }

  // Initialize connection
  console.log('Step 1: Initialize MCP connection');
  console.log('-'.repeat(40));
  
  try {
    const initResponse = await sendAndWait('initialize', {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'test-client', version: '1.0.0' },
      capabilities: {},
    });
    
    if (initResponse.result) {
      console.log('✅ Connection initialized');
      console.log('   Server:', initResponse.result.serverInfo?.name, initResponse.result.serverInfo?.version);
    } else if (initResponse.error) {
      console.log('❌ Initialize failed:', initResponse.error.message);
    }
  } catch (error) {
    console.log('❌ Initialize error:', error.message);
  }
  console.log();

  // Test 1: List tools
  console.log('Step 2: List available tools');
  console.log('-'.repeat(40));
  
  try {
    const toolsResponse = await sendAndWait('tools/list', {});
    
    if (toolsResponse.result && toolsResponse.result.tools) {
      const tools = toolsResponse.result.tools;
      console.log(`✅ Found ${tools.length} tools:`);
      
      const expectedTools = ['shine_search', 'shine_ask', 'shine_status'];
      for (const tool of tools) {
        const isExpected = expectedTools.includes(tool.name);
        const icon = isExpected ? '  ✓' : '  ⚠️';
        console.log(`${icon} ${tool.name}: ${tool.description.substring(0, 60)}...`);
      }
      
      // Check all expected tools present
      const foundTools = tools.map(t => t.name);
      const missing = expectedTools.filter(t => !foundTools.includes(t));
      if (missing.length > 0) {
        console.log(`❌ Missing expected tools: ${missing.join(', ')}`);
      } else {
        console.log('✅ All expected tools present');
      }
    } else if (toolsResponse.error) {
      console.log('❌ List tools failed:', toolsResponse.error.message);
    }
  } catch (error) {
    console.log('❌ List tools error:', error.message);
  }
  console.log();

  // Test 2: Check source status
  console.log('Step 3: Check source availability (shine_status)');
  console.log('-'.repeat(40));
  
  try {
    const statusResponse = await sendAndWait('tools/call', {
      name: 'shine_status',
      arguments: {},
    });
    
    if (statusResponse.result && statusResponse.result.content) {
      const content = statusResponse.result.content[0]?.text;
      if (content) {
        const status = JSON.parse(content);
        console.log(`✅ Status check completed: ${status.summary}`);
        console.log('   Source availability:');
        
        for (const [source, info] of Object.entries(status.sources)) {
          const icon = info.available ? '✓' : '✗';
          const errorInfo = info.error ? ` (${info.error})` : '';
          console.log(`     ${icon} ${source}: ${info.available ? 'Available' : 'Unavailable'}${errorInfo}`);
        }
      }
    } else if (statusResponse.error) {
      console.log('❌ Status check failed:', statusResponse.error.message);
    }
  } catch (error) {
    console.log('❌ Status check error:', error.message);
  }
  console.log();

  // Test 3: Search for "AWS migration"
  console.log('Step 4: Search for "AWS migration" (shine_search)');
  console.log('-'.repeat(40));
  
  try {
    const searchResponse = await sendAndWait('tools/call', {
      name: 'shine_search',
      arguments: { query: 'AWS migration' },
    }, 15000); // Longer timeout for search
    
    if (searchResponse.result && searchResponse.result.content) {
      const content = searchResponse.result.content[0]?.text;
      if (content) {
        const searchResult = JSON.parse(content);
        
        console.log(`✅ Search completed in ${searchResult.searchDuration?.toFixed(2)}s`);
        console.log(`   Total results: ${searchResult.totalResults}`);
        console.log();
        console.log('   Intent detection:');
        console.log(`     Sources: ${searchResult.intent?.detectedSources?.join(', ') || 'none'}`);
        console.log(`     Confidence: ${(searchResult.intent?.confidence * 100).toFixed(0)}%`);
        console.log(`     Reasoning: ${searchResult.intent?.reasoning}`);
        console.log();
        console.log('   Source results:');
        
        for (const [source, info] of Object.entries(searchResult.sourceStatus || {})) {
          if (info.searched) {
            const icon = info.error ? '⚠️' : '✓';
            const errorInfo = info.error ? ` (Error: ${info.error})` : '';
            console.log(`     ${icon} ${source}: ${info.resultCount} results${errorInfo}`);
          }
        }

        if (searchResult.results?.length > 0) {
          console.log();
          console.log('   Top 3 results:');
          for (const result of searchResult.results.slice(0, 3)) {
            console.log(`     - [${result.source}] ${result.title}`);
            console.log(`       Score: ${result.relevanceScore?.toFixed(2)} | URL: ${result.url?.substring(0, 50)}...`);
          }
        }
      }
    } else if (searchResponse.error) {
      console.log('❌ Search failed:', searchResponse.error.message);
    }
  } catch (error) {
    console.log('❌ Search error:', error.message);
  }
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log('• Server startup: ✅');
  console.log('• Tools available: Check above');
  console.log('• Source status: Check above');
  console.log('• Multi-source search: Check above');
  console.log();

  // Clean up
  proc.kill();
  process.exit(0);
}

runTests().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
});
