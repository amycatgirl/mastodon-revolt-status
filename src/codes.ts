function friendlyCode(statusCode: number): string {
  switch (statusCode) {
    case 200:
      return "Ok"
    case 202:
      return "Accepted"
    case 301:
      return "Moved Permamently"
    case 302:
      return "Found"
    case 400:
      return "Bad Request"
    case 401:
      return "Unauthorized"
    case 403:
      return "Forbidden"
    case 404:
      return "Not Found"
    case 410:
      return "Gone, reduced to atoms"
    case 418:
      return "I am a teapot 🫖"
    case 429:
      return "Too many requests"
    case 500:
      return "Internal server error"
    case 502:
      return "Bad gateway"
    case 503:
      return "Service Unavailable"
    case 504:
    case 408:
    case 524:
      return "Timeout"
    case 521:
      return "Web server is down"
    case 522:
      return "Connection timed out"
    case 523:
      return "Origin is unreachable"
    case 525:
      return "Handshake failed"
    case 526:
      return "Invalid certificate (oh oh!)"
    default:
      return "I don't know how to handle that code, so here is this message instead."      
  }
}

export { friendlyCode }
