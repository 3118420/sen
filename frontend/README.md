# VoiceInsight Frontend

A React-based frontend for the VoiceInsight speech-to-text and sentiment analysis application.

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env.local` file for development:

```env
VITE_API_URL=https://1treu6p055.execute-api.us-east-1.amazonaws.com/prod
VITE_ENVIRONMENT=development
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

### Vercel Deployment

Environment variables are configured in `vercel.json` for production deployment.

## 🌐 API Connectivity

### Localhost vs Production Issues

The application is designed to work seamlessly in both development and production environments:

1. **Development**: Uses direct API calls to AWS Lambda
2. **Production**: Uses the same API endpoint with enhanced error handling

### Common Issues & Solutions

#### 1. CORS Errors
- **Problem**: Cross-origin requests blocked
- **Solution**: API Gateway CORS is configured, frontend uses proper headers

#### 2. Lambda Cold Starts
- **Problem**: First request takes 10-30 seconds
- **Solution**: Implemented retry logic with exponential backoff

#### 3. File Upload Failures
- **Problem**: Large files or timeout issues
- **Solution**: Progress tracking, chunked uploads, extended timeouts

#### 4. Environment Variables Not Loading
- **Problem**: Variables undefined in production
- **Solution**: Proper Vite configuration and Vercel environment setup

## 🔍 Debugging

### Connection Testing
```bash
npm run test:connectivity
```

### Debug Mode
Set `VITE_DEBUG_MODE=true` to enable:
- Detailed API request/response logging
- Environment information display
- Connection status monitoring
- Error boundary details

### Production Debugging
1. Check browser console for errors
2. Verify environment variables in Vercel dashboard
3. Test API endpoints directly
4. Monitor network requests in DevTools

## 📁 Project Structure

```
src/
├── components/          # React components
├── config/             # Environment configuration
├── hooks/              # Custom React hooks
├── services/           # API services and utilities
├── styles/             # CSS and styling
└── types/              # TypeScript type definitions
```

## 🛠 Key Features

### Enhanced Error Handling
- Comprehensive error boundaries
- Network error recovery
- User-friendly error messages
- Automatic retry logic

### Responsive Design
- Mobile-first approach
- Device-specific optimizations
- Touch-friendly interfaces
- Adaptive layouts

### Performance Optimization
- Code splitting
- Lazy loading
- Optimized bundle size
- Efficient re-renders

### Accessibility
- WCAG 2.1 compliance
- Keyboard navigation
- Screen reader support
- High contrast mode

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Environment variables are auto-configured via `vercel.json`
3. Automatic deployments on push to main branch

### Manual Deployment
```bash
npm run build:production
# Deploy dist/ folder to your hosting provider
```

## 🔧 Configuration Files

### `vercel.json`
- Build configuration
- Environment variables
- Routing rules
- Headers configuration

### `vite.config.ts`
- Build optimization
- Development server setup
- Environment variable handling
- Plugin configuration

## 📊 Monitoring

### Connection Status
- Real-time API connectivity monitoring
- Latency tracking
- Error rate monitoring
- Automatic reconnection

### Error Tracking
- Global error handlers
- Unhandled promise rejection tracking
- Component error boundaries
- Detailed error reporting

## 🧪 Testing

### Connectivity Tests
```bash
npm run test:connectivity
```

### Manual Testing Checklist
- [ ] Audio recording works
- [ ] File upload succeeds
- [ ] API responses are received
- [ ] Error handling works
- [ ] Offline/online detection
- [ ] Mobile responsiveness

## 🔒 Security

### API Security
- No sensitive data in frontend
- Secure HTTPS connections
- CORS protection
- Input validation

### Content Security
- XSS protection
- Content type validation
- Secure headers
- Input sanitization

## 📈 Performance

### Bundle Analysis
```bash
npm run analyze
```

### Optimization Techniques
- Tree shaking
- Code splitting
- Image optimization
- Lazy loading
- Caching strategies

## 🐛 Troubleshooting

### Common Issues

1. **API Not Responding**
   - Check network connection
   - Verify API URL in environment variables
   - Test with connectivity script

2. **Build Failures**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify environment variables

3. **Vercel Deployment Issues**
   - Check build logs in Vercel dashboard
   - Verify environment variables are set
   - Test build locally first

4. **CORS Errors**
   - Verify API Gateway CORS configuration
   - Check request headers
   - Test with different browsers

### Getting Help

1. Check browser console for errors
2. Run connectivity test script
3. Review error boundary details
4. Check Vercel deployment logs
5. Test API endpoints directly

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.