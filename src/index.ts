#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import WebSocket from 'ws';
import http from 'http';

interface Target {
  description: string;
  devtoolsFrontendUrl: string;
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

interface ListTargetsArgs {
  refresh?: boolean;
}

interface ConnectTargetArgs {
  id: string;
}

interface GetLogsArgs {
  clear?: boolean;
}

class BrowserLoggerServer {
  private server: Server;
  private ws: WebSocket | null = null;
  private logs: string[] = [];
  private targets: Target[] = [];
  private currentTarget: Target | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'browser-logger',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.updateTargets();
    
    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      if (this.ws) {
        this.ws.close();
      }
      await this.server.close();
      process.exit(0);
    });
  }

  private async updateTargets() {
    try {
      console.error('Fetching Chrome DevTools targets...');
      
      const targets = await new Promise<Target[]>((resolve, reject) => {
        http.get('http://localhost:9222/json', (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              reject(err);
            }
          });
        }).on('error', reject);
      });

      this.targets = targets;
      console.error('Found targets:', targets.map(t => ({title: t.title, type: t.type, url: t.url})));

    } catch (err) {
      console.error('Error fetching targets:', err);
      this.targets = [];
    }
  }

  private async connectToTarget(target: Target) {
    if (this.ws) {
      this.ws.close();
    }

    try {
      console.error(`Connecting to target: ${target.title} (${target.url})`);

      this.ws = new WebSocket(target.webSocketDebuggerUrl);
      this.currentTarget = target;
      
      this.ws.on('open', () => {
        console.error('Connected to target');
        if (this.ws) {
          this.ws.send(JSON.stringify({
            id: 1,
            method: 'Runtime.enable'
          }));
        }
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.error('Received message:', message);
          
          if (message.method === 'Runtime.consoleAPICalled') {
            const log = {
              type: message.params.type,
              timestamp: new Date().toISOString(),
              message: message.params.args.map((arg: any) => 
                typeof arg.value !== 'undefined' ? arg.value : arg.description
              ).join(' ')
            };
            this.logs.push(JSON.stringify(log));
            console.error('Logged console message:', log);
          } else if (message.method === 'Runtime.exceptionThrown') {
            const log = {
              type: 'error',
              timestamp: new Date().toISOString(),
              message: `${message.params.exceptionDetails.text} at ${message.params.exceptionDetails.url}`
            };
            this.logs.push(JSON.stringify(log));
            console.error('Logged error:', log);
          }
        } catch (err) {
          console.error('Error processing message:', err);
        }
      });

      this.ws.on('error', (err) => {
        console.error('WebSocket error:', err);
      });

      this.ws.on('close', () => {
        console.error('Disconnected from target');
        this.currentTarget = null;
      });

    } catch (err) {
      console.error('Error connecting to target:', err);
      this.currentTarget = null;
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_targets',
          description: 'List available browser targets',
          inputSchema: {
            type: 'object',
            properties: {
              refresh: {
                type: 'boolean',
                description: 'Refresh the targets list',
              },
            },
          },
        },
        {
          name: 'connect_target',
          description: 'Connect to a specific target',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Target ID to connect to',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'get_logs',
          description: 'Get browser console logs',
          inputSchema: {
            type: 'object',
            properties: {
              clear: {
                type: 'boolean',
                description: 'Clear logs after retrieving',
              },
            },
          },
        },
        {
          name: 'clear_logs',
          description: 'Clear all stored logs',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'list_targets': {
          const args = request.params.arguments as ListTargetsArgs;
          if (args && args.refresh) {
            await this.updateTargets();
          }
          return {
            content: [
              {
                type: 'text',
                text: this.targets.map(t => 
                  `ID: ${t.id}\nTitle: ${t.title}\nType: ${t.type}\nURL: ${t.url}\n`
                ).join('\n') || '(No targets found)',
              },
            ],
          };
        }

        case 'connect_target': {
          const args = request.params.arguments;
          if (!args || typeof args !== 'object' || !('id' in args) || typeof args.id !== 'string') {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Target ID is required and must be a string'
            );
          }
          const target = this.targets.find(t => t.id === args.id);
          if (!target) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Target not found: ${args.id}`
            );
          }
          await this.connectToTarget(target);
          return {
            content: [
              {
                type: 'text',
                text: `Connected to: ${target.title}`,
              },
            ],
          };
        }

        case 'get_logs': {
          const args = request.params.arguments as GetLogsArgs;
          console.error('Current logs:', this.logs);
          const logs = [...this.logs];
          if (args && args.clear) {
            this.logs = [];
          }
          return {
            content: [
              {
                type: 'text',
                text: logs.join('\n') || '(No logs yet)',
              },
            ],
          };
        }

        case 'clear_logs': {
          this.logs = [];
          return {
            content: [
              {
                type: 'text',
                text: 'Logs cleared',
              },
            ],
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Browser Logger MCP server running');
  }
}

const server = new BrowserLoggerServer();
server.run().catch(console.error);
