precision mediump float;

varying vec2 v_size;

bool insideOuterRoundedRect(vec2 point, vec2 center, float width, float height, float radius) {
    float a = width / 2.0 - radius;
    float b = height / 2.0 - radius;
    float c = radius;

    vec2 relPoint = point - center;

    return pow(max(abs(relPoint.x) - a, 0.0), 2.0) + 
        pow(max(abs(relPoint.y) - b, 0.0), 2.0) <= 
        pow(c, 2.0);
}

bool insideInnerRoundedRect(vec2 point, vec2 center, float width, float height, float radius, float thickness) {
    float a = width / 2.0 - radius;
    float b = height / 2.0 - radius;
    float c = radius;

    vec2 relPoint = point - center;

    return pow(max(abs(relPoint.x) - a + thickness, 0.0), 2.0) + 
        pow(max(abs(relPoint.y) - b + thickness, 0.0), 2.0) <=
        pow(c - thickness, 2.0);
}

void main(void) {
    vec4 alpha = vec4(0.0, 0.0, 0.0, 0.0);
    vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
    vec4 white = vec4(1.0, 1.0, 1.0, 1.0);
    float pointThickness = 0.005;
    float pointRadius = 0.1;

    float pointWidth = 1.0;
    float pointHeight = 1.0;
    if (v_size.x > v_size.y) 
        pointHeight = v_size.y / v_size.x;
    else 
        pointWidth = v_size.x / v_size.y;

    bool isInsideOuter = insideOuterRoundedRect(gl_PointCoord, vec2(0.5, 0.5), pointWidth, pointHeight, pointRadius);
    bool isInsideInner = insideInnerRoundedRect(gl_PointCoord, vec2(0.5, 0.5), pointWidth, pointHeight, pointRadius, pointThickness);

    // If the point is outside the outer rounded rectangle, it is transparent
    if (!isInsideOuter) {
        gl_FragColor = alpha;
        return;
    }
    // If outside the inner and inside the outer, it is black
    if (!isInsideInner && isInsideOuter) {
        gl_FragColor = black;
        return;
    }
    // If inside the inner, it is white
    if (isInsideInner) {
        gl_FragColor = white;
    }

}