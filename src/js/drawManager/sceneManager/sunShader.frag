#version 300 es    
    precision mediump float;

    // our texture
    uniform sampler2D uCanvasSampler;

    uniform vec2 u_sunPosition;
    
    // the texCoords passed in from the vertex shader.
    in vec2 v_texCoord;

    out vec4 fragColor;
    
    void main() {
      float decay=1.0;
      float exposure=1.0;
      float density=1.0;
      float weight=0.021;
      vec2 lightPositionOnScreen = vec2(u_sunPosition.x,1.0 - u_sunPosition.y);      
      vec2 texCoord = v_texCoord;

      /// samples will describe the rays quality, you can play with
      const int samples = 75;      

      vec2 deltaTexCoord = (v_texCoord - lightPositionOnScreen.xy);
      deltaTexCoord *= 1.0 / float(samples) * density;
      float illuminationDecay = 1.0;
      vec4 color = texture(uCanvasSampler, texCoord.xy);
      
      for(int i= 0; i <= samples ; i++)
      {
          if(samples < i) {
            break;
          }
          texCoord -= deltaTexCoord;
          vec4 texSample = texture(uCanvasSampler, texCoord);
          texSample *= illuminationDecay * weight;
          color += texSample;
          illuminationDecay *= decay;
      }
        color *= exposure;
      fragColor = color;
    }