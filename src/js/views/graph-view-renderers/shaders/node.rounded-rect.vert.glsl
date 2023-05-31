attribute vec2 a_position;
attribute vec2 a_size;

uniform float u_ratio;
uniform float u_scale;
uniform mat3 u_matrix;

varying vec2 v_size;

void main() {
    gl_Position = vec4(
        (u_matrix * vec3(a_position, 1)).xy, 
        0.0, 
        1.0
    );

    gl_PointSize = max(a_size.x, a_size.y) * u_ratio * u_scale  * 2.0;

    // Pass size and thickness to fragment shader
    v_size = a_size;
}